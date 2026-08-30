import {
  useEffect,
  useRef,
  type MutableRefObject,
  type RefObject,
} from "react";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { BoundedTileResourceCache } from "@/features/airport/map/boundedTileResourceCache";
import {
  resolveThreeOsmSourceViewCenter,
  resolveThreeOsmTileWindowKey,
} from "@/features/airport/map/threeOsmCameraLod";
import type { TileCoordinate } from "@/features/airport/map/threeOsmProjection";
import type { ThreeOsmTileWindow } from "@/features/airport/map/threeOsmTileWindow";
import { resolveThreeOsmDirectionalTilePrefetch } from "@/features/airport/map/threeOsmTilePrefetch";

type PrefetchKind = "raster" | "vector";

type PrefetchRun = {
  windowKey: string;
  requested: number;
  settled: number;
  loaded: number;
  failed: number;
  cancelled: boolean;
  releases: Array<() => void>;
};

export function useThreeOsmTilePrefetch<T>({
  rootRef,
  controlsRef,
  cacheRef,
  enabled,
  kind,
  sourceProjectionCenter,
  sourceTileCenter,
  sourceTileWindowKey,
  sceneZoom,
  tileWindow,
  buildUrl,
  hasDisplayedContent,
  lifecycleKey,
}: {
  rootRef: RefObject<HTMLElement | null>;
  controlsRef: MutableRefObject<OrbitControls | null>;
  cacheRef: MutableRefObject<BoundedTileResourceCache<T> | null>;
  enabled: boolean;
  kind: PrefetchKind;
  sourceProjectionCenter: TileCoordinate;
  sourceTileCenter: TileCoordinate;
  sourceTileWindowKey: string;
  sceneZoom: number;
  tileWindow: ThreeOsmTileWindow;
  buildUrl: (tile: TileCoordinate) => string | null;
  hasDisplayedContent: () => boolean;
  lifecycleKey: unknown;
}) {
  const readyWindowRef = useRef("");
  const buildUrlRef = useRef(buildUrl);
  const hasDisplayedContentRef = useRef(hasDisplayedContent);
  buildUrlRef.current = buildUrl;
  hasDisplayedContentRef.current = hasDisplayedContent;

  useEffect(() => {
    const root = rootRef.current;
    const controls = controlsRef.current;
    const cache = cacheRef.current;
    const prefix = kind === "raster" ? "pocRasterPrefetch" : "pocVectorPrefetch";
    const dataKey = (suffix: string) => `${prefix}${suffix}`;
    if (!root || !controls || !cache || !enabled) {
      readyWindowRef.current = "";
      if (root) root.dataset[dataKey("State")] = "disabled";
      return undefined;
    }

    const increment = (suffix: string, amount = 1) => {
      const key = dataKey(suffix);
      root.dataset[key] = String(Number(root.dataset[key] || 0) + amount);
    };
    if (readyWindowRef.current === sourceTileWindowKey) {
      readyWindowRef.current = "";
      increment("Adoptions");
      root.dataset[dataKey("State")] = "adopted";
    } else {
      readyWindowRef.current = "";
      root.dataset[dataKey("State")] = "idle";
    }
    root.dataset[dataKey("Window")] = "none";
    root.dataset[dataKey("Requested")] ||= "0";
    root.dataset[dataKey("Loaded")] ||= "0";
    root.dataset[dataKey("Failed")] ||= "0";

    let activeRun: PrefetchRun | null = null;
    let lastCandidateWindowKey = "";
    let prefetchFrame = 0;

    const releaseRun = (run: PrefetchRun) => {
      run.releases.splice(0).forEach((release) => release());
    };
    const cancelActiveRun = (reason: string, countCancellation = true) => {
      const run = activeRun;
      if (!run) return;
      run.cancelled = true;
      releaseRun(run);
      activeRun = null;
      if (countCancellation && run.settled < run.requested) {
        increment("Cancellations");
      }
      root.dataset[dataKey("State")] = reason;
    };
    const finishRun = (run: PrefetchRun) => {
      if (run.cancelled || activeRun !== run || run.settled < run.requested) {
        return;
      }
      releaseRun(run);
      activeRun = null;
      root.dataset[dataKey("State")] =
        run.failed === 0 ? "ready" : run.loaded > 0 ? "partial" : "degraded";
      if (kind === "vector") {
        root.dataset.pocVectorPrefetchWorkerBuildsAtFinish =
          root.dataset.pocVectorWorkerBuilds || "0";
      }
      if (run.loaded > 0) readyWindowRef.current = run.windowKey;
    };
    const startPrefetch = (candidateCenter: TileCoordinate) => {
      const candidateWindowKey = `${resolveThreeOsmTileWindowKey(candidateCenter)}/w${tileWindow.key}`;
      if (candidateWindowKey === sourceTileWindowKey) {
        lastCandidateWindowKey = "";
        readyWindowRef.current = "";
        cancelActiveRun("idle");
        root.dataset[dataKey("Window")] = "none";
        return;
      }
      if (candidateWindowKey === lastCandidateWindowKey) return;
      lastCandidateWindowKey = candidateWindowKey;
      if (readyWindowRef.current !== candidateWindowKey) {
        readyWindowRef.current = "";
      }
      cancelActiveRun("superseded");

      const tiles = resolveThreeOsmDirectionalTilePrefetch({
        currentCenter: sourceTileCenter,
        candidateCenter,
        tileWindow,
      });
      if (!tiles.length) {
        root.dataset[dataKey("State")] = "skipped-nonadjacent";
        root.dataset[dataKey("Window")] = candidateWindowKey;
        return;
      }

      const run: PrefetchRun = {
        windowKey: candidateWindowKey,
        requested: tiles.length,
        settled: 0,
        loaded: 0,
        failed: 0,
        cancelled: false,
        releases: [],
      };
      activeRun = run;
      increment("Runs");
      root.dataset[dataKey("State")] = "loading";
      root.dataset[dataKey("Window")] = candidateWindowKey;
      root.dataset[dataKey("LastWindow")] = candidateWindowKey;
      root.dataset[dataKey("Requested")] = String(run.requested);
      root.dataset[dataKey("Loaded")] = "0";
      root.dataset[dataKey("Failed")] = "0";
      if (kind === "vector") {
        root.dataset.pocVectorPrefetchWorkerBuildsAtStart =
          root.dataset.pocVectorWorkerBuilds || "0";
      }

      tiles.forEach((tile) => {
        const url = buildUrlRef.current(tile);
        let tileSettled = false;
        const settle = (loaded: boolean) => {
          if (tileSettled || run.cancelled) return;
          tileSettled = true;
          run.settled += 1;
          if (loaded) run.loaded += 1;
          else run.failed += 1;
          root.dataset[dataKey("Loaded")] = String(run.loaded);
          root.dataset[dataKey("Failed")] = String(run.failed);
          finishRun(run);
        };
        if (!url) {
          settle(false);
          return;
        }
        const handle = cache.acquirePrefetch(url, {
          ready: () => settle(true),
          error: () => settle(false),
        });
        run.releases.push(handle.release);
        increment(handle.cacheHit ? "CacheHits" : "CacheMisses");
        if (handle.status === "ready" && handle.value) settle(true);
        else if (handle.status === "error") settle(false);
      });
    };
    const prefetchForCurrentCamera = () => {
      prefetchFrame = 0;
      if (!hasDisplayedContentRef.current()) return;
      startPrefetch(
        resolveThreeOsmSourceViewCenter({
          projectionCenter: sourceProjectionCenter,
          sceneZoom,
          targetX: controls.target.x,
          targetZ: controls.target.z,
        }),
      );
    };
    const handleCameraChange = () => {
      window.cancelAnimationFrame(prefetchFrame);
      prefetchFrame = window.requestAnimationFrame(prefetchForCurrentCamera);
    };

    controls.addEventListener("change", handleCameraChange);
    return () => {
      controls.removeEventListener("change", handleCameraChange);
      window.cancelAnimationFrame(prefetchFrame);
      const visibleWindow =
        kind === "raster"
          ? root.dataset.pocTileWindowKey
          : root.dataset.pocVectorVisibleWindow;
      const adopted =
        activeRun?.windowKey && visibleWindow === activeRun.windowKey;
      if (adopted) {
        increment("Adoptions");
        root.dataset[dataKey("State")] = "adopted-loading";
      }
      cancelActiveRun(
        adopted ? "adopted-loading" : "cancelled",
        !adopted,
      );
    };
  }, [
    cacheRef,
    controlsRef,
    enabled,
    kind,
    lifecycleKey,
    rootRef,
    sceneZoom,
    sourceProjectionCenter,
    sourceTileCenter,
    sourceTileWindowKey,
    tileWindow,
  ]);
}
