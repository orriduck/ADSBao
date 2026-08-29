export const THREE_OSM_ACCEPTANCE_SCHEMA_VERSION = 1;
export const THREE_OSM_ACCEPTANCE_REPORT_KIND =
  "adsbao-three-osm-real-device-acceptance";
export const THREE_OSM_ACCEPTANCE_MIN_DURATION_MS = 20 * 60 * 1_000;
export const THREE_OSM_ACCEPTANCE_MIN_TOUCH_INTERACTIONS = 10;
export const THREE_OSM_ACCEPTANCE_MIN_MODE_SWITCHES = 150;
export const THREE_OSM_ACCEPTANCE_MAX_FOREGROUND_RECOVERY_MS = 2_000;
export const THREE_OSM_ACCEPTANCE_MAX_LONG_TASK_MS = 250;
export const THREE_OSM_ACCEPTANCE_MAX_SCENE_RENDER_MS = 250;
export const THREE_OSM_ACCEPTANCE_MAX_TILE_CACHE_SIZE = 72;
export const THREE_OSM_ACCEPTANCE_MAX_TEXTURES = 80;
export const THREE_OSM_ACCEPTANCE_MAX_GEOMETRIES = 32;
export const THREE_OSM_ACCEPTANCE_MAX_PROGRAMS = 24;

export type ThreeOsmThermalAssessment =
  | "unreviewed"
  | "acceptable"
  | "uncomfortable";

export type ThreeOsmPhysicalDeviceAssessment = "unreviewed" | "confirmed";

export type ThreeOsmAcceptanceGateStatus = "pass" | "pending" | "fail";

export type ThreeOsmAcceptanceDevice = {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  physicalIPhoneCandidate: boolean;
};

export type ThreeOsmAcceptanceSample = {
  nowMs: number;
  runtimeId?: string;
  modeSwitches?: number;
  renderCount?: number;
  renderSceneMaxMs?: number;
  slowSceneCount?: number;
  longTaskCount?: number;
  longTaskTotalMs?: number;
  longTaskMaxMs?: number;
  textures?: number;
  geometries?: number;
  programs?: number;
  tileCacheSize?: number;
  tilesRequested?: number;
  tilesLoaded?: number;
  tilesFailed?: number;
  contextLosses?: number;
  contextRestores?: number;
  basemap?: string;
  tileSource?: string;
  tileSourceOrigin?: string;
  tileSourceConfig?: string;
  visibility?: string;
  usedJsHeapBytes?: number | null;
};

export type ThreeOsmAcceptanceSession = {
  schemaVersion: typeof THREE_OSM_ACCEPTANCE_SCHEMA_VERSION;
  sessionId: string;
  route: string;
  startedAtMs: number;
  updatedAtMs: number;
  documentBootIds: string[];
  runtimeIds: string[];
  device: ThreeOsmAcceptanceDevice;
  physicalDeviceAssessment: ThreeOsmPhysicalDeviceAssessment;
  thermalAssessment: ThreeOsmThermalAssessment;
  thermalAssessedAtMs: number | null;
  touchInteractions: number;
  backgroundCycles: number;
  foregroundRestores: number;
  foregroundRecoveryLastMs: number | null;
  foregroundRecoveryMaxMs: number | null;
  modeSwitchesMax: number;
  renderCountMax: number;
  renderSceneMaxMs: number;
  slowSceneCountMax: number;
  longTaskCountMax: number;
  longTaskTotalMsMax: number;
  longTaskMaxMs: number;
  texturesMax: number;
  geometriesMax: number;
  programsMax: number;
  tileCacheSizeMax: number;
  tilesRequestedMax: number;
  tilesLoadedMax: number;
  tilesFailedMax: number;
  contextLossesMax: number;
  contextRestoresMax: number;
  usedJsHeapInitialBytes: number | null;
  usedJsHeapMinBytes: number | null;
  usedJsHeapMaxBytes: number | null;
  usedJsHeapLastBytes: number | null;
  latest: {
    basemap: string;
    tileSource: string;
    tileSourceOrigin: string;
    tileSourceConfig: string;
    visibility: string;
  };
};

export type ThreeOsmAcceptanceGate = {
  id:
    | "duration"
    | "physical-iphone"
    | "touch"
    | "mode-switches"
    | "background-recovery"
    | "runtime-continuity"
    | "basemap"
    | "webgl-recovery"
    | "resource-bounds"
    | "render-stability"
    | "thermal";
  status: ThreeOsmAcceptanceGateStatus;
  evidence: string;
};

export type ThreeOsmAcceptanceEvaluation = {
  status: "passed" | "incomplete" | "failed";
  elapsedMs: number;
  gates: ThreeOsmAcceptanceGate[];
};

const ACCEPTANCE_SESSION_NUMBER_FIELDS = [
  "startedAtMs",
  "updatedAtMs",
  "touchInteractions",
  "backgroundCycles",
  "foregroundRestores",
  "modeSwitchesMax",
  "renderCountMax",
  "renderSceneMaxMs",
  "slowSceneCountMax",
  "longTaskCountMax",
  "longTaskTotalMsMax",
  "longTaskMaxMs",
  "texturesMax",
  "geometriesMax",
  "programsMax",
  "tileCacheSizeMax",
  "tilesRequestedMax",
  "tilesLoadedMax",
  "tilesFailedMax",
  "contextLossesMax",
  "contextRestoresMax",
] as const;

const ACCEPTANCE_SESSION_NULLABLE_NUMBER_FIELDS = [
  "thermalAssessedAtMs",
  "foregroundRecoveryLastMs",
  "foregroundRecoveryMaxMs",
  "usedJsHeapInitialBytes",
  "usedJsHeapMinBytes",
  "usedJsHeapMaxBytes",
  "usedJsHeapLastBytes",
] as const;

const ACCEPTANCE_SESSION_INTEGER_FIELDS = [
  "touchInteractions",
  "backgroundCycles",
  "foregroundRestores",
  "modeSwitchesMax",
  "renderCountMax",
  "slowSceneCountMax",
  "longTaskCountMax",
  "texturesMax",
  "geometriesMax",
  "programsMax",
  "tileCacheSizeMax",
  "tilesRequestedMax",
  "tilesLoadedMax",
  "tilesFailedMax",
  "contextLossesMax",
  "contextRestoresMax",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonNegativeFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isNullableNonNegativeFiniteNumber(value: unknown) {
  return value === null || isNonNegativeFiniteNumber(value);
}

function isBoundedPlainText(value: unknown, maxLength: number) {
  if (typeof value !== "string" || value.length > maxLength) return false;
  return [...value].every((character) => {
    const codePoint = character.codePointAt(0) || 0;
    return codePoint > 31 && codePoint !== 127;
  });
}

function isUniqueStringArray(value: unknown, allowEmpty: boolean) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) return false;
  if (!value.every((item) => typeof item === "string" && item.length > 0)) {
    return false;
  }
  return new Set(value).size === value.length;
}

function finiteNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function maxValue(current: number, next: unknown) {
  return Math.max(current, finiteNumber(next));
}

export function createThreeOsmAcceptanceSession(input: {
  sessionId: string;
  route: string;
  nowMs: number;
  documentBootId: string;
  device: ThreeOsmAcceptanceDevice;
}): ThreeOsmAcceptanceSession {
  return {
    schemaVersion: THREE_OSM_ACCEPTANCE_SCHEMA_VERSION,
    sessionId: input.sessionId,
    route: input.route,
    startedAtMs: input.nowMs,
    updatedAtMs: input.nowMs,
    documentBootIds: [input.documentBootId],
    runtimeIds: [],
    device: input.device,
    physicalDeviceAssessment: "unreviewed",
    thermalAssessment: "unreviewed",
    thermalAssessedAtMs: null,
    touchInteractions: 0,
    backgroundCycles: 0,
    foregroundRestores: 0,
    foregroundRecoveryLastMs: null,
    foregroundRecoveryMaxMs: null,
    modeSwitchesMax: 0,
    renderCountMax: 0,
    renderSceneMaxMs: 0,
    slowSceneCountMax: 0,
    longTaskCountMax: 0,
    longTaskTotalMsMax: 0,
    longTaskMaxMs: 0,
    texturesMax: 0,
    geometriesMax: 0,
    programsMax: 0,
    tileCacheSizeMax: 0,
    tilesRequestedMax: 0,
    tilesLoadedMax: 0,
    tilesFailedMax: 0,
    contextLossesMax: 0,
    contextRestoresMax: 0,
    usedJsHeapInitialBytes: null,
    usedJsHeapMinBytes: null,
    usedJsHeapMaxBytes: null,
    usedJsHeapLastBytes: null,
    latest: {
      basemap: "loading",
      tileSource: "unknown",
      tileSourceOrigin: "unknown",
      tileSourceConfig: "unknown",
      visibility: "visible",
    },
  };
}

export function isThreeOsmAcceptanceSession(
  value: unknown,
): value is ThreeOsmAcceptanceSession {
  if (!isRecord(value)) return false;
  const session = value;
  const device = session.device;
  const latest = session.latest;
  if (!isRecord(device) || !isRecord(latest)) return false;

  return (
    session.schemaVersion === THREE_OSM_ACCEPTANCE_SCHEMA_VERSION &&
    typeof session.sessionId === "string" && session.sessionId.length > 0 &&
    typeof session.route === "string" && session.route.startsWith("/") &&
    ACCEPTANCE_SESSION_NUMBER_FIELDS.every((field) =>
      isNonNegativeFiniteNumber(session[field]),
    ) &&
    ACCEPTANCE_SESSION_INTEGER_FIELDS.every((field) =>
      Number.isInteger(session[field]),
    ) &&
    Number(session.updatedAtMs) >= Number(session.startedAtMs) &&
    ACCEPTANCE_SESSION_NULLABLE_NUMBER_FIELDS.every((field) =>
      isNullableNonNegativeFiniteNumber(session[field]),
    ) &&
    isUniqueStringArray(session.documentBootIds, false) &&
    isUniqueStringArray(session.runtimeIds, true) &&
    (session.physicalDeviceAssessment === "unreviewed" ||
      session.physicalDeviceAssessment === "confirmed") &&
    (session.thermalAssessment === "unreviewed" ||
      session.thermalAssessment === "acceptable" ||
      session.thermalAssessment === "uncomfortable") &&
    isBoundedPlainText(device.userAgent, 1_000) &&
    isBoundedPlainText(device.platform, 80) &&
    isNonNegativeFiniteNumber(device.maxTouchPoints) &&
    Number.isInteger(device.maxTouchPoints) &&
    isNonNegativeFiniteNumber(device.viewportWidth) &&
    Number(device.viewportWidth) > 0 &&
    isNonNegativeFiniteNumber(device.viewportHeight) &&
    Number(device.viewportHeight) > 0 &&
    isNonNegativeFiniteNumber(device.devicePixelRatio) &&
    Number(device.devicePixelRatio) > 0 &&
    typeof device.physicalIPhoneCandidate === "boolean" &&
    device.physicalIPhoneCandidate ===
      (/iPhone/i.test(String(device.userAgent)) &&
        Number(device.maxTouchPoints) > 0) &&
    (latest.basemap === "loading" ||
      latest.basemap === "ready" ||
      latest.basemap === "partial" ||
      latest.basemap === "degraded") &&
    typeof latest.tileSource === "string" &&
    /^[a-z0-9][a-z0-9-]{0,39}$/.test(latest.tileSource) &&
    (latest.tileSourceOrigin === "unknown" ||
      latest.tileSourceOrigin === "runtime" ||
      latest.tileSourceOrigin === "build") &&
    (latest.tileSourceConfig === "unknown" ||
      latest.tileSourceConfig === "ready" ||
      latest.tileSourceConfig === "missing" ||
      latest.tileSourceConfig === "invalid") &&
    (latest.visibility === "visible" ||
      latest.visibility === "hidden" ||
      latest.visibility === "prerender")
  );
}

export function registerThreeOsmAcceptanceDocumentBoot(
  session: ThreeOsmAcceptanceSession,
  documentBootId: string,
  nowMs: number,
) {
  if (!session.documentBootIds.includes(documentBootId)) {
    session.documentBootIds.push(documentBootId);
  }
  session.updatedAtMs = nowMs;
  return session;
}

export function registerThreeOsmAcceptanceRuntime(
  session: ThreeOsmAcceptanceSession,
  runtimeId: string,
  nowMs: number,
) {
  if (runtimeId && !session.runtimeIds.includes(runtimeId)) {
    session.runtimeIds.push(runtimeId);
  }
  session.updatedAtMs = nowMs;
  return session;
}

export function recordThreeOsmAcceptanceTouch(
  session: ThreeOsmAcceptanceSession,
  nowMs: number,
) {
  session.touchInteractions += 1;
  session.updatedAtMs = nowMs;
  return session;
}

export function recordThreeOsmAcceptanceBackground(
  session: ThreeOsmAcceptanceSession,
  nowMs: number,
) {
  session.backgroundCycles += 1;
  session.updatedAtMs = nowMs;
  return session;
}

export function recordThreeOsmAcceptanceForeground(
  session: ThreeOsmAcceptanceSession,
  recoveryMs: number,
  nowMs: number,
) {
  const boundedRecoveryMs = Math.max(0, finiteNumber(recoveryMs));
  session.foregroundRestores += 1;
  session.foregroundRecoveryLastMs = boundedRecoveryMs;
  session.foregroundRecoveryMaxMs = Math.max(
    session.foregroundRecoveryMaxMs || 0,
    boundedRecoveryMs,
  );
  session.updatedAtMs = nowMs;
  return session;
}

export function setThreeOsmAcceptanceThermalAssessment(
  session: ThreeOsmAcceptanceSession,
  thermalAssessment: ThreeOsmThermalAssessment,
  nowMs: number,
) {
  session.thermalAssessment = thermalAssessment;
  session.thermalAssessedAtMs = nowMs;
  session.updatedAtMs = nowMs;
  return session;
}

export function setThreeOsmAcceptancePhysicalDeviceAssessment(
  session: ThreeOsmAcceptanceSession,
  physicalDeviceAssessment: ThreeOsmPhysicalDeviceAssessment,
  nowMs: number,
) {
  session.physicalDeviceAssessment = physicalDeviceAssessment;
  session.updatedAtMs = nowMs;
  return session;
}

export function sampleThreeOsmAcceptanceSession(
  session: ThreeOsmAcceptanceSession,
  sample: ThreeOsmAcceptanceSample,
) {
  session.updatedAtMs = sample.nowMs;
  if (sample.runtimeId) {
    registerThreeOsmAcceptanceRuntime(session, sample.runtimeId, sample.nowMs);
  }
  session.modeSwitchesMax = maxValue(session.modeSwitchesMax, sample.modeSwitches);
  session.renderCountMax = maxValue(session.renderCountMax, sample.renderCount);
  session.renderSceneMaxMs = maxValue(
    session.renderSceneMaxMs,
    sample.renderSceneMaxMs,
  );
  session.slowSceneCountMax = maxValue(
    session.slowSceneCountMax,
    sample.slowSceneCount,
  );
  session.longTaskCountMax = maxValue(
    session.longTaskCountMax,
    sample.longTaskCount,
  );
  session.longTaskTotalMsMax = maxValue(
    session.longTaskTotalMsMax,
    sample.longTaskTotalMs,
  );
  session.longTaskMaxMs = maxValue(session.longTaskMaxMs, sample.longTaskMaxMs);
  session.texturesMax = maxValue(session.texturesMax, sample.textures);
  session.geometriesMax = maxValue(session.geometriesMax, sample.geometries);
  session.programsMax = maxValue(session.programsMax, sample.programs);
  session.tileCacheSizeMax = maxValue(
    session.tileCacheSizeMax,
    sample.tileCacheSize,
  );
  session.tilesRequestedMax = maxValue(
    session.tilesRequestedMax,
    sample.tilesRequested,
  );
  session.tilesLoadedMax = maxValue(session.tilesLoadedMax, sample.tilesLoaded);
  session.tilesFailedMax = maxValue(session.tilesFailedMax, sample.tilesFailed);
  session.contextLossesMax = maxValue(
    session.contextLossesMax,
    sample.contextLosses,
  );
  session.contextRestoresMax = maxValue(
    session.contextRestoresMax,
    sample.contextRestores,
  );

  if (Number.isFinite(sample.usedJsHeapBytes)) {
    const heapBytes = Number(sample.usedJsHeapBytes);
    session.usedJsHeapInitialBytes ??= heapBytes;
    session.usedJsHeapMinBytes = Math.min(
      session.usedJsHeapMinBytes ?? heapBytes,
      heapBytes,
    );
    session.usedJsHeapMaxBytes = Math.max(
      session.usedJsHeapMaxBytes ?? heapBytes,
      heapBytes,
    );
    session.usedJsHeapLastBytes = heapBytes;
  }

  session.latest = {
    basemap: sample.basemap || session.latest.basemap,
    tileSource: sample.tileSource || session.latest.tileSource,
    tileSourceOrigin: sample.tileSourceOrigin || session.latest.tileSourceOrigin,
    tileSourceConfig: sample.tileSourceConfig || session.latest.tileSourceConfig,
    visibility: sample.visibility || session.latest.visibility,
  };
  return session;
}

function pendingOrPass(condition: boolean, durationComplete: boolean) {
  return condition && durationComplete ? "pass" : "pending";
}

export function evaluateThreeOsmAcceptanceSession(
  session: ThreeOsmAcceptanceSession,
  nowMs: number,
): ThreeOsmAcceptanceEvaluation {
  const elapsedMs = Math.max(0, nowMs - session.startedAtMs);
  const durationComplete = elapsedMs >= THREE_OSM_ACCEPTANCE_MIN_DURATION_MS;
  const backgroundBalanced =
    session.backgroundCycles >= 1 &&
    session.foregroundRestores >= session.backgroundCycles &&
    session.foregroundRecoveryMaxMs != null;
  const backgroundTooSlow =
    session.foregroundRecoveryMaxMs != null &&
    session.foregroundRecoveryMaxMs > THREE_OSM_ACCEPTANCE_MAX_FOREGROUND_RECOVERY_MS;
  const contextBalanced = session.contextLossesMax === session.contextRestoresMax;
  const resourceBoundsOk =
    session.tileCacheSizeMax <= THREE_OSM_ACCEPTANCE_MAX_TILE_CACHE_SIZE &&
    session.texturesMax <= THREE_OSM_ACCEPTANCE_MAX_TEXTURES &&
    session.geometriesMax <= THREE_OSM_ACCEPTANCE_MAX_GEOMETRIES &&
    session.programsMax <= THREE_OSM_ACCEPTANCE_MAX_PROGRAMS;
  const renderingOk =
    session.longTaskMaxMs <= THREE_OSM_ACCEPTANCE_MAX_LONG_TASK_MS &&
    session.renderSceneMaxMs <= THREE_OSM_ACCEPTANCE_MAX_SCENE_RENDER_MS;
  const basemapOk =
    session.latest.basemap === "ready" && session.tilesFailedMax === 0;

  const gates: ThreeOsmAcceptanceGate[] = [
    {
      id: "duration",
      status: durationComplete ? "pass" : "pending",
      evidence: `${Math.round(elapsedMs / 1_000)}s / ${THREE_OSM_ACCEPTANCE_MIN_DURATION_MS / 1_000}s`,
    },
    {
      id: "physical-iphone",
      status:
        session.device.physicalIPhoneCandidate &&
        session.physicalDeviceAssessment === "confirmed"
          ? "pass"
          : "pending",
      evidence: `${session.device.platform || "unknown"}; touch=${session.device.maxTouchPoints}; operator=${session.physicalDeviceAssessment}`,
    },
    {
      id: "touch",
      status: pendingOrPass(
        session.touchInteractions >= THREE_OSM_ACCEPTANCE_MIN_TOUCH_INTERACTIONS,
        durationComplete,
      ),
      evidence: `${session.touchInteractions} / ${THREE_OSM_ACCEPTANCE_MIN_TOUCH_INTERACTIONS}`,
    },
    {
      id: "mode-switches",
      status: pendingOrPass(
        session.modeSwitchesMax >= THREE_OSM_ACCEPTANCE_MIN_MODE_SWITCHES,
        durationComplete,
      ),
      evidence: `${session.modeSwitchesMax} / ${THREE_OSM_ACCEPTANCE_MIN_MODE_SWITCHES}`,
    },
    {
      id: "background-recovery",
      status: backgroundTooSlow
        ? "fail"
        : backgroundBalanced
          ? pendingOrPass(true, durationComplete)
          : durationComplete && session.latest.visibility === "visible"
            ? "fail"
            : "pending",
      evidence: `${session.backgroundCycles} background / ${session.foregroundRestores} foreground; max=${session.foregroundRecoveryMaxMs ?? "n/a"}ms`,
    },
    {
      id: "runtime-continuity",
      status:
        session.documentBootIds.length > 1 || session.runtimeIds.length > 1
          ? "fail"
          : pendingOrPass(session.runtimeIds.length === 1, durationComplete),
      evidence: `${session.documentBootIds.length} document boot(s); ${session.runtimeIds.length} Three runtime(s)`,
    },
    {
      id: "basemap",
      status:
        session.tilesFailedMax > 0 || session.latest.basemap === "degraded"
          ? "fail"
          : pendingOrPass(basemapOk, durationComplete),
      evidence: `${session.latest.tileSource}/${session.latest.tileSourceOrigin}; ${session.latest.basemap}; ${session.tilesLoadedMax}/${session.tilesRequestedMax} loaded; ${session.tilesFailedMax} failed`,
    },
    {
      id: "webgl-recovery",
      status: contextBalanced
        ? pendingOrPass(true, durationComplete)
        : durationComplete
          ? "fail"
          : "pending",
      evidence: `${session.contextLossesMax} lost / ${session.contextRestoresMax} restored`,
    },
    {
      id: "resource-bounds",
      status: resourceBoundsOk
        ? pendingOrPass(true, durationComplete)
        : "fail",
      evidence: `cache=${session.tileCacheSizeMax}; textures=${session.texturesMax}; geometries=${session.geometriesMax}; programs=${session.programsMax}`,
    },
    {
      id: "render-stability",
      status: renderingOk ? pendingOrPass(true, durationComplete) : "fail",
      evidence: `scene max=${session.renderSceneMaxMs.toFixed(1)}ms; long task max=${session.longTaskMaxMs.toFixed(1)}ms; count=${session.longTaskCountMax}`,
    },
    {
      id: "thermal",
      status:
        session.thermalAssessment === "uncomfortable"
          ? "fail"
          : session.thermalAssessment === "acceptable" &&
              durationComplete &&
              session.thermalAssessedAtMs != null &&
              session.thermalAssessedAtMs >=
                session.startedAtMs + THREE_OSM_ACCEPTANCE_MIN_DURATION_MS
            ? "pass"
            : "pending",
      evidence: `${session.thermalAssessment}; assessedAt=${
        session.thermalAssessedAtMs == null
          ? "n/a"
          : Math.round((session.thermalAssessedAtMs - session.startedAtMs) / 1_000)
      }s`,
    },
  ];
  return {
    status: gates.some((gate) => gate.status === "fail")
      ? "failed"
      : gates.every((gate) => gate.status === "pass")
        ? "passed"
        : "incomplete",
    elapsedMs,
    gates,
  };
}

export function buildThreeOsmAcceptanceReport(
  session: ThreeOsmAcceptanceSession,
  nowMs: number,
) {
  return {
    kind: THREE_OSM_ACCEPTANCE_REPORT_KIND,
    schemaVersion: THREE_OSM_ACCEPTANCE_SCHEMA_VERSION,
    generatedAt: new Date(nowMs).toISOString(),
    evaluation: evaluateThreeOsmAcceptanceSession(session, nowMs),
    session,
    notes: {
      thermal:
        "Thermal state is a manual observation. Browser APIs do not expose a trustworthy device-temperature reading.",
      memory:
        session.usedJsHeapInitialBytes == null
          ? "JavaScript heap telemetry is unavailable in this browser; runtime continuity and bounded GPU counters remain recorded."
          : "JavaScript heap values are non-standard browser diagnostics and are evidence, not a device-wide memory measurement.",
      device:
        "The user agent and touch capability identify an iPhone candidate; the operator must still confirm this report came from physical hardware.",
    },
  };
}
