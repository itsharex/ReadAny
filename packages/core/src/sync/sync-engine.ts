/**
 * Sync engine — whole-database overwrite sync via WebDAV.
 * Modeled on anx-reader's syncData approach.
 */

import { getDB } from "../db/database";
import { getSyncAdapter } from "./sync-adapter";
import { WebDavClient } from "./webdav-client";
import {
  REMOTE_COVERS,
  REMOTE_DATA,
  REMOTE_DB_FILE,
  REMOTE_FILES,
  REMOTE_MANIFEST,
  REMOTE_ROOT,
  SYNC_META_KEYS,
  SYNC_SCHEMA_VERSION,
  type RemoteSyncManifest,
  type SyncDirection,
  type SyncResult,
} from "./sync-types";

/** Get a sync metadata value from the database */
async function getSyncMeta(key: string): Promise<string | null> {
  const db = await getDB();
  const rows = await db.select<{ value: string }[]>(
    "SELECT value FROM sync_metadata WHERE key = ?",
    [key],
  );
  return (rows as { value: string }[])[0]?.value ?? null;
}

/** Set a sync metadata value in the database */
async function setSyncMeta(key: string, value: string): Promise<void> {
  const db = await getDB();
  await db.execute(
    "INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?)",
    [key, value],
  );
}

/**
 * Determine sync direction by comparing local and remote state.
 *
 * Logic (following anx-reader):
 * - No remote manifest → "upload" (first sync)
 * - No local hash → "download" (first sync on this device, or after reset)
 * - Remote manifest.lastModifiedAt matches stored → "none" (no changes)
 * - Local hash changed AND remote unchanged → "upload"
 * - Remote changed AND local unchanged → "download"
 * - Both changed → "conflict" (user must pick)
 */
export async function determineSyncDirection(
  client: WebDavClient,
): Promise<{
  direction: SyncDirection;
  remoteManifest: RemoteSyncManifest | null;
}> {
  const adapter = getSyncAdapter();

  // Get remote manifest
  const remoteManifest =
    await client.getJSON<RemoteSyncManifest>(REMOTE_MANIFEST);

  // Check schema version compatibility
  if (
    remoteManifest &&
    remoteManifest.schemaVersion > SYNC_SCHEMA_VERSION
  ) {
    throw new Error(
      `Remote sync schema version (${remoteManifest.schemaVersion}) is newer than local (${SYNC_SCHEMA_VERSION}). Please update the app.`,
    );
  }

  // No remote data → first sync, upload
  if (!remoteManifest) {
    return { direction: "upload", remoteManifest: null };
  }

  // Get local state
  const storedRemoteModifiedAt = await getSyncMeta(
    SYNC_META_KEYS.LAST_REMOTE_MODIFIED_AT,
  );
  const storedDbHash = await getSyncMeta(SYNC_META_KEYS.LAST_SYNC_DB_HASH);

  // No local sync history → first sync on this device, download
  if (!storedDbHash) {
    return { direction: "download", remoteManifest };
  }

  // Check if remote changed
  const remoteChanged =
    storedRemoteModifiedAt !== String(remoteManifest.lastModifiedAt);

  // Check if local DB changed (compare current hash with stored hash)
  const dbPath = await adapter.getDatabasePath();
  const currentDbHash = await adapter.hashFile(dbPath);
  const localChanged = currentDbHash !== storedDbHash;

  if (!remoteChanged && !localChanged) {
    return { direction: "none", remoteManifest };
  }
  if (localChanged && !remoteChanged) {
    return { direction: "upload", remoteManifest };
  }
  if (remoteChanged && !localChanged) {
    return { direction: "download", remoteManifest };
  }
  // Both changed
  return { direction: "conflict", remoteManifest };
}

/**
 * Execute the upload phase: snapshot local DB → upload to WebDAV.
 */
async function executeUpload(client: WebDavClient): Promise<void> {
  const adapter = getSyncAdapter();
  const tempDir = await adapter.getTempDir();
  const snapshotPath = adapter.joinPath(
    tempDir,
    `readany_snapshot_${Date.now()}.db`,
  );

  try {
    // 1. Create clean snapshot via VACUUM INTO
    await adapter.vacuumInto(snapshotPath);

    // 2. Read snapshot into memory
    const data = await adapter.readFileBytes(snapshotPath);

    // 3. Upload to WebDAV
    await client.put(REMOTE_DB_FILE, data);

    // 4. Upload manifest
    const manifest: RemoteSyncManifest = {
      lastModifiedAt: Date.now(),
      uploadedBy: await adapter.getDeviceName(),
      appVersion: await adapter.getAppVersion(),
      schemaVersion: SYNC_SCHEMA_VERSION,
    };
    await client.putJSON(REMOTE_MANIFEST, manifest);

    // 5. Update local sync metadata
    const dbPath = await adapter.getDatabasePath();
    const dbHash = await adapter.hashFile(dbPath);
    await setSyncMeta(SYNC_META_KEYS.LAST_SYNC_DB_HASH, dbHash);
    await setSyncMeta(
      SYNC_META_KEYS.LAST_REMOTE_MODIFIED_AT,
      String(manifest.lastModifiedAt),
    );
    await setSyncMeta(
      SYNC_META_KEYS.LAST_SYNC_AT,
      String(Date.now()),
    );
  } finally {
    // Clean up snapshot
    try {
      if (await adapter.fileExists(snapshotPath)) {
        await adapter.deleteFile(snapshotPath);
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Execute the download phase: download remote DB → validate → backup → replace.
 */
async function executeDownload(client: WebDavClient): Promise<void> {
  const adapter = getSyncAdapter();
  const tempDir = await adapter.getTempDir();
  const dbPath = await adapter.getDatabasePath();
  const tempDbPath = adapter.joinPath(
    tempDir,
    `readany_download_${Date.now()}.db`,
  );
  const backupPath = adapter.joinPath(
    tempDir,
    `readany_backup_${Date.now()}.db`,
  );

  try {
    // 1. Download remote DB to temp file
    const data = await client.get(REMOTE_DB_FILE);
    await adapter.writeFileBytes(tempDbPath, data);

    // 2. Validate integrity
    const isValid = await adapter.integrityCheck(tempDbPath);
    if (!isValid) {
      throw new Error(
        "Downloaded database failed integrity check. Sync aborted.",
      );
    }

    // 3. Backup current DB
    if (await adapter.fileExists(dbPath)) {
      await adapter.copyFile(dbPath, backupPath);
    }

    // 4. Close active connection
    await adapter.closeDatabase();

    // 5. Replace DB file
    await adapter.copyFile(tempDbPath, dbPath);

    // 6. Reopen database
    await adapter.reopenDatabase();

    // 7. Verify reopened DB works
    const db = await getDB();
    await db.select<unknown[]>("SELECT COUNT(*) as c FROM books", []);

    // 8. Update sync metadata
    const remoteManifest =
      await client.getJSON<RemoteSyncManifest>(REMOTE_MANIFEST);
    const dbHash = await adapter.hashFile(dbPath);
    await setSyncMeta(SYNC_META_KEYS.LAST_SYNC_DB_HASH, dbHash);
    if (remoteManifest) {
      await setSyncMeta(
        SYNC_META_KEYS.LAST_REMOTE_MODIFIED_AT,
        String(remoteManifest.lastModifiedAt),
      );
    }
    await setSyncMeta(
      SYNC_META_KEYS.LAST_SYNC_AT,
      String(Date.now()),
    );
  } catch (e) {
    // If we have a backup and the error occurred after closing DB, try to recover
    if (await adapter.fileExists(backupPath)) {
      try {
        await adapter.copyFile(backupPath, dbPath);
        await adapter.reopenDatabase();
      } catch {
        // Recovery failed — DB may be in a bad state
      }
    }
    throw e;
  } finally {
    // Clean up temp files
    for (const file of [tempDbPath, backupPath]) {
      try {
        if (await adapter.fileExists(file)) {
          await adapter.deleteFile(file);
        }
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Sync book files and covers between local and remote.
 */
async function syncFiles(client: WebDavClient): Promise<{
  filesUploaded: number;
  filesDownloaded: number;
}> {
  const adapter = getSyncAdapter();
  const db = await getDB();
  let filesUploaded = 0;
  let filesDownloaded = 0;

  // Get all books from DB
  const books = await db.select<
    { id: string; file_path: string; file_hash: string; cover_url: string }[]
  >(
    "SELECT id, file_path, file_hash, cover_url FROM books",
    [],
  );

  const appDataDir = await adapter.getAppDataDir();

  // --- Sync book files ---
  const remoteFiles = await client.safeReadDir(REMOTE_FILES);
  const remoteFileNames = new Set(
    remoteFiles.filter((f) => !f.isCollection).map((f) => f.name),
  );

  for (const book of books) {
    if (!book.file_path) continue;

    // Determine the remote file name (use file_hash if available, otherwise use filename)
    const localPath = book.file_path.startsWith("/") || book.file_path.startsWith("file://")
      ? book.file_path
      : adapter.joinPath(appDataDir, book.file_path);
    const ext = book.file_path.split(".").pop() || "epub";
    const remoteName = book.file_hash
      ? `${book.file_hash}.${ext}`
      : book.file_path.split("/").pop() || `${book.id}.${ext}`;

    // Upload if not on remote and exists locally
    if (!remoteFileNames.has(remoteName) && await adapter.fileExists(localPath)) {
      try {
        const data = await adapter.readFileBytes(localPath);
        await client.put(`${REMOTE_FILES}/${remoteName}`, data);
        filesUploaded++;
      } catch {
        // Skip files that fail to upload
      }
    }

    // Download if not local but exists on remote
    if (!await adapter.fileExists(localPath) && remoteFileNames.has(remoteName)) {
      try {
        const data = await client.get(`${REMOTE_FILES}/${remoteName}`);
        // Ensure directory exists
        const dir = localPath.substring(0, localPath.lastIndexOf("/"));
        if (dir) await adapter.ensureDir(dir);
        await adapter.writeFileBytes(localPath, data);
        filesDownloaded++;
      } catch {
        // Skip files that fail to download
      }
    }
  }

  // --- Sync cover images ---
  const remoteCovers = await client.safeReadDir(REMOTE_COVERS);
  const remoteCoverNames = new Set(
    remoteCovers.filter((f) => !f.isCollection).map((f) => f.name),
  );

  for (const book of books) {
    if (!book.cover_url) continue;

    const coverLocalPath = book.cover_url.startsWith("/") || book.cover_url.startsWith("file://")
      ? book.cover_url
      : adapter.joinPath(appDataDir, book.cover_url);
    const coverExt = book.cover_url.split(".").pop() || "jpg";
    const coverRemoteName = `${book.id}.${coverExt}`;

    // Upload cover if not on remote
    if (
      !remoteCoverNames.has(coverRemoteName) &&
      await adapter.fileExists(coverLocalPath)
    ) {
      try {
        const data = await adapter.readFileBytes(coverLocalPath);
        await client.put(`${REMOTE_COVERS}/${coverRemoteName}`, data);
        filesUploaded++;
      } catch {
        // Skip
      }
    }

    // Download cover if not local
    if (
      !await adapter.fileExists(coverLocalPath) &&
      remoteCoverNames.has(coverRemoteName)
    ) {
      try {
        const data = await client.get(
          `${REMOTE_COVERS}/${coverRemoteName}`,
        );
        const dir = coverLocalPath.substring(
          0,
          coverLocalPath.lastIndexOf("/"),
        );
        if (dir) await adapter.ensureDir(dir);
        await adapter.writeFileBytes(coverLocalPath, data);
        filesDownloaded++;
      } catch {
        // Skip
      }
    }
  }

  return { filesUploaded, filesDownloaded };
}

/**
 * Run the full sync flow.
 *
 * @param client WebDAV client instance
 * @param direction The sync direction (if "conflict", caller must resolve first)
 * @returns SyncResult
 */
export async function runSync(
  client: WebDavClient,
  direction: "upload" | "download",
): Promise<SyncResult> {
  const startTime = Date.now();

  try {
    // 1. Ensure remote directory structure
    await client.ensureDirectory(REMOTE_ROOT);
    await client.ensureDirectory(REMOTE_DATA);
    await client.ensureDirectory(REMOTE_FILES);
    await client.ensureDirectory(REMOTE_COVERS);

    // 2. Execute database sync
    if (direction === "upload") {
      await executeUpload(client);
    } else {
      await executeDownload(client);
    }

    // 3. Sync files
    const { filesUploaded, filesDownloaded } = await syncFiles(client);

    return {
      success: true,
      direction,
      filesUploaded,
      filesDownloaded,
      durationMs: Date.now() - startTime,
    };
  } catch (e) {
    return {
      success: false,
      direction,
      filesUploaded: 0,
      filesDownloaded: 0,
      durationMs: Date.now() - startTime,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
