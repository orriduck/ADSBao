import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  buildThreeOsmAcceptanceReport,
  createThreeOsmAcceptanceSession,
  evaluateThreeOsmAcceptanceSession,
  isThreeOsmAcceptanceSession,
  recordThreeOsmAcceptanceBackground,
  recordThreeOsmAcceptanceForeground,
  recordThreeOsmAcceptanceTouch,
  registerThreeOsmAcceptanceDocumentBoot,
  sampleThreeOsmAcceptanceSession,
  setThreeOsmAcceptancePhysicalDeviceAssessment,
  setThreeOsmAcceptanceThermalAssessment,
  type ThreeOsmAcceptanceSession,
  type ThreeOsmThermalAssessment,
  type ThreeOsmWakeLockStatus,
} from "@/features/airport/map/threeOsmAcceptanceModel";

const DOCUMENT_BOOT_ID = `document-${Math.random().toString(36).slice(2, 10)}`;
const SAMPLE_INTERVAL_MS = 5_000;
const RUNTIME_REGISTRATION_DELAY_MS = 1_000;
const FOREGROUND_RENDER_TIMEOUT_MS = 2_500;

type PerformanceWithMemory = Performance & {
  memory?: { usedJSHeapSize?: number };
};

function numericDatasetValue(value: string | undefined) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function createSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `three-osm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readDevice() {
  const userAgent = navigator.userAgent || "";
  const maxTouchPoints = Number(navigator.maxTouchPoints || 0);
  return {
    userAgent,
    platform: navigator.platform || "",
    maxTouchPoints,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio || 1,
    physicalIPhoneCandidate: /iPhone/i.test(userAgent) && maxTouchPoints > 0,
  };
}

function readStoredSession(storageKey: string) {
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isThreeOsmAcceptanceSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function persistSession(storageKey: string, session: ThreeOsmAcceptanceSession) {
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(session));
  } catch {
    // A report remains usable in memory when Safari storage is unavailable.
  }
}

function createFreshSession(route: string, nowMs = Date.now()) {
  return createThreeOsmAcceptanceSession({
    sessionId: createSessionId(),
    route,
    nowMs,
    documentBootId: DOCUMENT_BOOT_ID,
    device: readDevice(),
  });
}

async function shareOrDownloadReport(report: unknown, sessionId: string) {
  const json = `${JSON.stringify(report, null, 2)}\n`;
  const filename = `adsbao-three-osm-acceptance-${sessionId}.json`;
  const file = new File([json], filename, { type: "application/json" });
  try {
    if (
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        files: [file],
        title: "ADSBao Three+OSM acceptance",
      });
      return "shared" as const;
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
  }
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return "downloaded" as const;
}

export function useThreeOsmAcceptanceRecorder(input: {
  enabled: boolean;
  rootRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  runtimeId: string;
  wakeLockStatus: ThreeOsmWakeLockStatus;
}) {
  const { enabled, rootRef, canvasRef, runtimeId, wakeLockStatus } = input;
  const route = typeof window === "undefined" ? "" : window.location.pathname;
  const storageKey = `adsbao:three-osm-acceptance:${
    typeof window === "undefined" ? "server" : window.location.pathname
  }`;
  const sessionRef = useRef<ThreeOsmAcceptanceSession | null>(null);
  const foregroundRenderProbeRef = useRef<number | null>(null);
  const runtimeRegisteredRef = useRef(false);
  const wakeLockStatusRef = useRef(wakeLockStatus);
  wakeLockStatusRef.current = wakeLockStatus;
  const [evaluation, setEvaluation] = useState<ReturnType<
    typeof evaluateThreeOsmAcceptanceSession
  > | null>(null);
  const [exportState, setExportState] = useState<
    "idle" | "sharing" | "shared" | "downloaded" | "failed"
  >("idle");

  const publish = useCallback((updateUi = true) => {
    const root = rootRef.current;
    const session = sessionRef.current;
    if (!root || !session) return null;
    const memory = (performance as PerformanceWithMemory).memory;
    sampleThreeOsmAcceptanceSession(session, {
      nowMs: Date.now(),
      runtimeId: runtimeRegisteredRef.current
        ? root.dataset.pocRuntimeId || runtimeId
        : undefined,
      modeSwitches: numericDatasetValue(root.dataset.pocSoakModeSwitches),
      renderCount: numericDatasetValue(root.dataset.pocRenderCount),
      renderSceneMaxMs: numericDatasetValue(root.dataset.pocRenderSceneMaxMs),
      slowSceneCount: numericDatasetValue(root.dataset.pocRenderSlowSceneCount),
      longTaskCount: numericDatasetValue(root.dataset.pocLongTaskCount),
      longTaskTotalMs: numericDatasetValue(root.dataset.pocLongTaskTotalMs),
      longTaskMaxMs: numericDatasetValue(root.dataset.pocLongTaskMaxMs),
      textures: numericDatasetValue(root.dataset.pocTextures),
      geometries: numericDatasetValue(root.dataset.pocGeometries),
      programs: numericDatasetValue(root.dataset.pocPrograms),
      tileCacheSize: numericDatasetValue(root.dataset.pocTileCacheSize),
      tilesRequested: numericDatasetValue(root.dataset.pocTilesRequested),
      tilesLoaded: numericDatasetValue(root.dataset.pocTilesLoaded),
      tilesFailed: numericDatasetValue(root.dataset.pocTilesFailed),
      contextLosses: numericDatasetValue(root.dataset.pocContextLosses),
      contextRestores: numericDatasetValue(root.dataset.pocContextRestores),
      trafficRendered: numericDatasetValue(root.dataset.pocAircraft),
      trafficReal: numericDatasetValue(root.dataset.pocAircraftReal),
      trafficSynthetic: numericDatasetValue(root.dataset.pocAircraftSynthetic),
      trafficStressTarget: numericDatasetValue(
        root.dataset.pocTrafficStress === "inactive"
          ? undefined
          : root.dataset.pocTrafficStress,
      ),
      basemap: root.dataset.pocBasemap,
      tileSource: root.dataset.pocTileSource,
      tileSourceOrigin: root.dataset.pocTileSourceConfigOrigin,
      tileSourceConfig: root.dataset.pocTileSourceConfig,
      visibility: document.visibilityState,
      wakeLockStatus: wakeLockStatusRef.current,
      usedJsHeapBytes: Number.isFinite(memory?.usedJSHeapSize)
        ? Number(memory?.usedJSHeapSize)
        : null,
    });
    const nextEvaluation = evaluateThreeOsmAcceptanceSession(session, Date.now());
    persistSession(storageKey, session);
    root.dataset.pocAcceptance = nextEvaluation.status;
    root.dataset.pocAcceptanceElapsedMs = String(Math.round(nextEvaluation.elapsedMs));
    root.dataset.pocAcceptanceTouchInteractions = String(session.touchInteractions);
    root.dataset.pocAcceptanceBackgroundCycles = String(session.backgroundCycles);
    root.dataset.pocAcceptanceForegroundRestores = String(session.foregroundRestores);
    root.dataset.pocAcceptanceForegroundRecoveryMaxMs = String(
      session.foregroundRecoveryMaxMs ?? "",
    );
    root.dataset.pocAcceptanceDocumentBoots = String(session.documentBootIds.length);
    root.dataset.pocAcceptanceRuntimes = String(session.runtimeIds.length);
    root.dataset.pocAcceptanceThermal = session.thermalAssessment;
    root.dataset.pocAcceptancePhysicalDevice = session.physicalDeviceAssessment;
    root.dataset.pocAcceptanceWakeLock = session.wakeLock.latestStatus;
    root.dataset.pocAcceptanceWakeLockActiveSamples = String(
      session.wakeLock.activeSamples,
    );
    root.dataset.pocAcceptanceWakeLockErrorSamples = String(
      session.wakeLock.errorSamples,
    );
    root.dataset.pocAcceptanceTrafficRenderedMax = String(
      session.trafficRenderedMax,
    );
    root.dataset.pocAcceptanceTrafficRealMax = String(session.trafficRealMax);
    root.dataset.pocAcceptanceTrafficSyntheticMax = String(
      session.trafficSyntheticMax,
    );
    root.dataset.pocAcceptanceTrafficStressTargetMax = String(
      session.trafficStressTargetMax,
    );
    root.dataset.pocAcceptancePassedGates = String(
      nextEvaluation.gates.filter((gate) => gate.status === "pass").length,
    );
    root.dataset.pocAcceptanceFailedGates = String(
      nextEvaluation.gates.filter((gate) => gate.status === "fail").length,
    );
    if (updateUi) setEvaluation(nextEvaluation);
    return session;
  }, [rootRef, runtimeId, storageKey]);

  const reset = useCallback(() => {
    if (!enabled) return;
    sessionRef.current = createFreshSession(route);
    setExportState("idle");
    publish();
  }, [enabled, publish, route]);

  const setThermalAssessment = useCallback(
    (assessment: ThreeOsmThermalAssessment) => {
      const session = sessionRef.current;
      if (!enabled || !session) return;
      setThreeOsmAcceptanceThermalAssessment(session, assessment, Date.now());
      publish();
    },
    [enabled, publish],
  );

  const confirmPhysicalDevice = useCallback(() => {
    const session = sessionRef.current;
    if (!enabled || !session) return;
    setThreeOsmAcceptancePhysicalDeviceAssessment(
      session,
      "confirmed",
      Date.now(),
    );
    publish();
  }, [enabled, publish]);

  const exportReport = useCallback(async () => {
    const session = publish();
    if (!session) return;
    setExportState("sharing");
    try {
      const result = await shareOrDownloadReport(
        buildThreeOsmAcceptanceReport(session, Date.now()),
        session.sessionId,
      );
      setExportState(result);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setExportState("idle");
      } else {
        setExportState("failed");
      }
    }
  }, [publish]);

  useEffect(() => {
    if (!enabled) return undefined;
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return undefined;
    const restored = readStoredSession(storageKey);
    const session = restored?.route === route ? restored : createFreshSession(route);
    registerThreeOsmAcceptanceDocumentBoot(session, DOCUMENT_BOOT_ID, Date.now());
    sessionRef.current = session;
    runtimeRegisteredRef.current = false;
    let hiddenAtMs = document.visibilityState === "hidden" ? Date.now() : null;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch" || !sessionRef.current) return;
      recordThreeOsmAcceptanceTouch(sessionRef.current, Date.now());
      publish();
    };
    const handleVisibilityChange = () => {
      const current = sessionRef.current;
      if (!current) return;
      if (document.visibilityState === "hidden") {
        hiddenAtMs = Date.now();
        recordThreeOsmAcceptanceBackground(current, hiddenAtMs);
        publish();
        return;
      }
      if (hiddenAtMs == null) return;
      const renderCountBefore = numericDatasetValue(root.dataset.pocRenderCount);
      const probe = () => {
        if (document.visibilityState !== "visible" || !sessionRef.current) return;
        const renderCountAfter = numericDatasetValue(root.dataset.pocRenderCount);
        const recoveryMs = performance.now() - foregroundProbeStartedAt;
        if (
          renderCountAfter > renderCountBefore ||
          recoveryMs >= FOREGROUND_RENDER_TIMEOUT_MS
        ) {
          recordThreeOsmAcceptanceForeground(
            sessionRef.current,
            recoveryMs,
            Date.now(),
          );
          foregroundRenderProbeRef.current = null;
          hiddenAtMs = null;
          publish();
          return;
        }
        foregroundRenderProbeRef.current = window.requestAnimationFrame(probe);
      };
      const foregroundProbeStartedAt = performance.now();
      if (foregroundRenderProbeRef.current != null) {
        window.cancelAnimationFrame(foregroundRenderProbeRef.current);
      }
      foregroundRenderProbeRef.current = window.requestAnimationFrame(probe);
    };
    const handlePageHide = () => {
      if (document.visibilityState !== "hidden" || hiddenAtMs != null) return;
      hiddenAtMs = Date.now();
      if (sessionRef.current) {
        recordThreeOsmAcceptanceBackground(sessionRef.current, hiddenAtMs);
        publish();
      }
    };

    const runtimeTimer = window.setTimeout(() => {
      runtimeRegisteredRef.current = true;
      publish();
    }, RUNTIME_REGISTRATION_DELAY_MS);
    const sampleInterval = window.setInterval(publish, SAMPLE_INTERVAL_MS);
    canvas.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    publish();

    return () => {
      window.clearTimeout(runtimeTimer);
      window.clearInterval(sampleInterval);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      runtimeRegisteredRef.current = false;
      if (foregroundRenderProbeRef.current != null) {
        window.cancelAnimationFrame(foregroundRenderProbeRef.current);
        foregroundRenderProbeRef.current = null;
      }
      publish(false);
    };
  }, [canvasRef, enabled, publish, rootRef, route, storageKey]);

  return {
    evaluation,
    exportState,
    reset,
    confirmPhysicalDevice,
    setThermalAssessment,
    exportReport,
  };
}
