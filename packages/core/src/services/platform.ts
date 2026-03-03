/**
 * IPlatformService — Platform abstraction layer
 *
 * Each platform (desktop, mobile, web) provides its own implementation.
 * Core business logic depends only on this interface, never on Tauri APIs directly.
 */

export interface FilePickerOptions {
  multiple?: boolean;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
}

export interface WebSocketOptions {
  headers?: Record<string, string>;
}

export interface UpdateInfo {
  version: string;
  notes?: string;
  date?: string;
}

export interface IDatabase {
  execute(sql: string, params?: unknown[]): Promise<void>;
  select<T>(sql: string, params?: unknown[]): Promise<T[]>;
  close(): Promise<void>;
}

export interface IWebSocket {
  send(data: string | ArrayBuffer): void;
  close(): void;
  onMessage(handler: (data: string | ArrayBuffer) => void): void;
  onClose(handler: () => void): void;
  onError(handler: (error: unknown) => void): void;
}

export interface IPlatformService {
  // ---- Platform info ----
  readonly platformType: "desktop" | "mobile" | "web";
  readonly isMobile: boolean;
  readonly isDesktop: boolean;

  // ---- File system ----
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, data: Uint8Array): Promise<void>;
  writeTextFile(path: string, content: string): Promise<void>;
  readTextFile(path: string): Promise<string>;
  mkdir(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  getAppDataDir(): Promise<string>;
  joinPath(...parts: string[]): Promise<string>;
  convertFileSrc(path: string): string;

  // ---- File picker ----
  pickFile(options?: FilePickerOptions): Promise<string | null>;

  // ---- Database ----
  loadDatabase(path: string): Promise<IDatabase>;

  // ---- Network (for scenarios requiring custom headers) ----
  fetch(url: string, options?: RequestInit): Promise<Response>;
  createWebSocket(
    url: string,
    options?: WebSocketOptions
  ): Promise<IWebSocket>;

  // ---- App info ----
  getAppVersion(): Promise<string>;

  // ---- Update (desktop only, mobile returns noop) ----
  checkUpdate?(): Promise<UpdateInfo | null>;
  installUpdate?(): Promise<void>;
}

/**
 * Global platform service holder.
 * Must be initialized once at app startup via `setPlatformService()`.
 */
let _platformService: IPlatformService | null = null;

export function setPlatformService(service: IPlatformService): void {
  _platformService = service;
}

export function getPlatformService(): IPlatformService {
  if (!_platformService) {
    throw new Error(
      "PlatformService not initialized. Call setPlatformService() at app startup."
    );
  }
  return _platformService;
}
