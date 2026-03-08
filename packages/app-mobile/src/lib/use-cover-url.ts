/**
 * useCoverUrl — resolves a relative cover path to an absolute displayable URL.
 * On mobile (iOS/Android) the sandbox path can change between app restarts,
 * so we must resolve relative paths dynamically via appDataDir + convertFileSrc.
 */
import { useEffect, useState } from "react";
import { getPlatformService } from "@readany/core/services";

export function useCoverUrl(rawUrl: string | undefined | null): string | undefined {
  const [resolved, setResolved] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!rawUrl) {
      setResolved(undefined);
      return;
    }
    // Already an absolute URL — use as-is
    if (rawUrl.startsWith("http") || rawUrl.startsWith("asset") || rawUrl.startsWith("blob")) {
      setResolved(rawUrl);
      return;
    }
    // Relative path — resolve via appDataDir
    let cancelled = false;
    (async () => {
      try {
        const platform = getPlatformService();
        const appData = await platform.getAppDataDir();
        const { join } = await import("@tauri-apps/api/path");
        const absPath = await join(appData, rawUrl);
        if (!cancelled) {
          setResolved(platform.convertFileSrc(absPath));
        }
      } catch {
        if (!cancelled) setResolved(undefined);
      }
    })();
    return () => { cancelled = true; };
  }, [rawUrl]);

  return resolved;
}
