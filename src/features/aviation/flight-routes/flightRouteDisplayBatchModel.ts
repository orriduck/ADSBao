const ROUTE_DISPLAY_BATCH_MS = 180;

export function createRouteDisplayBatcher({
  publish,
  delayMs = ROUTE_DISPLAY_BATCH_MS,
  schedule = setTimeout,
  clearSchedule = clearTimeout,
}: {
  publish?: (routeVersion: number) => void;
  delayMs?: number;
  schedule?: (callback: () => void, delayMs?: number) => any;
  clearSchedule?: (handle: any) => void;
} = {}) {
  let publishedVersion = 0;
  let pendingVersion = 0;
  let timer = null;

  const flush = () => {
    timer = null;
    if (pendingVersion <= publishedVersion) return;
    publishedVersion = pendingVersion;
    publish?.(publishedVersion);
  };

  return {
    syncRouteVersion(routeVersion) {
      const nextVersion = Number(routeVersion);
      if (!Number.isFinite(nextVersion) || nextVersion <= publishedVersion) {
        return;
      }
      pendingVersion = Math.max(pendingVersion, nextVersion);
      if (timer) return;
      timer = schedule(flush, Math.max(0, delayMs));
    },

    dispose() {
      if (!timer) return;
      clearSchedule(timer);
      timer = null;
    },
  };
}
