import assert from "node:assert/strict";
import {
  THREE_OSM_ACCEPTANCE_MIN_DURATION_MS,
  createThreeOsmAcceptanceSession,
  evaluateThreeOsmAcceptanceSession,
  recordThreeOsmAcceptanceBackground,
  recordThreeOsmAcceptanceForeground,
  recordThreeOsmAcceptanceTouch,
  registerThreeOsmAcceptanceDocumentBoot,
  registerThreeOsmAcceptanceRuntime,
  sampleThreeOsmAcceptanceSession,
  setThreeOsmAcceptancePhysicalDeviceAssessment,
  setThreeOsmAcceptanceThermalAssessment,
} from "./threeOsmAcceptanceModel";

const start = Date.UTC(2026, 7, 29, 12, 0, 0);
const device = {
  userAgent: "Mozilla/5.0 (iPhone)",
  platform: "iPhone",
  maxTouchPoints: 5,
  viewportWidth: 390,
  viewportHeight: 844,
  devicePixelRatio: 3,
  physicalIPhoneCandidate: true,
};

function createPassingCandidate() {
  const session = createThreeOsmAcceptanceSession({
    sessionId: "session-1",
    route: "/airport/KBOS",
    nowMs: start,
    documentBootId: "document-1",
    device,
  });
  registerThreeOsmAcceptanceRuntime(session, "runtime-1", start + 1_000);
  setThreeOsmAcceptancePhysicalDeviceAssessment(session, "confirmed", start + 1_001);
  for (let index = 0; index < 10; index += 1) {
    recordThreeOsmAcceptanceTouch(session, start + index * 1_000);
  }
  recordThreeOsmAcceptanceBackground(session, start + 60_000);
  recordThreeOsmAcceptanceForeground(session, 180, start + 61_000);
  setThreeOsmAcceptanceThermalAssessment(
    session,
    "acceptable",
    start + THREE_OSM_ACCEPTANCE_MIN_DURATION_MS,
  );
  sampleThreeOsmAcceptanceSession(session, {
    nowMs: start + THREE_OSM_ACCEPTANCE_MIN_DURATION_MS,
    runtimeId: "runtime-1",
    modeSwitches: 171,
    renderCount: 900,
    renderSceneMaxMs: 180,
    slowSceneCount: 2,
    longTaskCount: 3,
    longTaskTotalMs: 421,
    longTaskMaxMs: 205.6,
    textures: 9,
    geometries: 8,
    programs: 9,
    tileCacheSize: 25,
    tilesRequested: 25,
    tilesLoaded: 25,
    tilesFailed: 0,
    contextLosses: 1,
    contextRestores: 1,
    basemap: "ready",
    tileSource: "licensed-raster",
    tileSourceOrigin: "runtime",
    tileSourceConfig: "ready",
    visibility: "visible",
    wakeLockStatus: "active",
    usedJsHeapBytes: 173_500_000,
  });
  return session;
}

const incomplete = createPassingCandidate();
const early = evaluateThreeOsmAcceptanceSession(
  incomplete,
  start + THREE_OSM_ACCEPTANCE_MIN_DURATION_MS - 1,
);
assert.equal(early.status, "incomplete");
assert.equal(early.gates.find((gate) => gate.id === "duration")?.status, "pending");

const passing = createPassingCandidate();
const passed = evaluateThreeOsmAcceptanceSession(
  passing,
  start + THREE_OSM_ACCEPTANCE_MIN_DURATION_MS,
);
assert.equal(passed.status, "passed");
assert.equal(passed.gates.every((gate) => gate.status === "pass"), true);
assert.deepEqual(passing.wakeLock, {
  latestStatus: "active",
  activeSamples: 1,
  inactiveSamples: 0,
  pendingSamples: 0,
  errorSamples: 0,
});

sampleThreeOsmAcceptanceSession(passing, {
  nowMs: start + THREE_OSM_ACCEPTANCE_MIN_DURATION_MS + 1,
  wakeLockStatus: "error",
});
assert.equal(passing.wakeLock.latestStatus, "error");
assert.equal(passing.wakeLock.errorSamples, 1);
assert.equal(
  evaluateThreeOsmAcceptanceSession(
    passing,
    start + THREE_OSM_ACCEPTANCE_MIN_DURATION_MS + 1,
  ).gates.length,
  11,
);

const restarted = createPassingCandidate();
registerThreeOsmAcceptanceDocumentBoot(
  restarted,
  "document-2",
  start + THREE_OSM_ACCEPTANCE_MIN_DURATION_MS,
);
registerThreeOsmAcceptanceRuntime(
  restarted,
  "runtime-2",
  start + THREE_OSM_ACCEPTANCE_MIN_DURATION_MS,
);
const restartedEvaluation = evaluateThreeOsmAcceptanceSession(
  restarted,
  start + THREE_OSM_ACCEPTANCE_MIN_DURATION_MS,
);
assert.equal(restartedEvaluation.status, "failed");
assert.equal(
  restartedEvaluation.gates.find((gate) => gate.id === "runtime-continuity")
    ?.status,
  "fail",
);

const hot = createPassingCandidate();
setThreeOsmAcceptanceThermalAssessment(
  hot,
  "uncomfortable",
  start + THREE_OSM_ACCEPTANCE_MIN_DURATION_MS,
);
assert.equal(
  evaluateThreeOsmAcceptanceSession(
    hot,
    start + THREE_OSM_ACCEPTANCE_MIN_DURATION_MS,
  ).gates.find((gate) => gate.id === "thermal")?.status,
  "fail",
);

const earlyThermalCheck = createPassingCandidate();
setThreeOsmAcceptanceThermalAssessment(
  earlyThermalCheck,
  "acceptable",
  start + 70_000,
);
assert.equal(
  evaluateThreeOsmAcceptanceSession(
    earlyThermalCheck,
    start + THREE_OSM_ACCEPTANCE_MIN_DURATION_MS,
  ).gates.find((gate) => gate.id === "thermal")?.status,
  "pending",
);

const providerFailure = createPassingCandidate();
sampleThreeOsmAcceptanceSession(providerFailure, {
  nowMs: start + THREE_OSM_ACCEPTANCE_MIN_DURATION_MS,
  tilesFailed: 1,
  basemap: "degraded",
});
assert.equal(
  evaluateThreeOsmAcceptanceSession(
    providerFailure,
    start + THREE_OSM_ACCEPTANCE_MIN_DURATION_MS,
  ).gates.find((gate) => gate.id === "basemap")?.status,
  "fail",
);

const stillBackgrounded = createPassingCandidate();
stillBackgrounded.startedAtMs = start + 1;
stillBackgrounded.foregroundRestores = 0;
stillBackgrounded.foregroundRecoveryLastMs = null;
stillBackgrounded.foregroundRecoveryMaxMs = null;
stillBackgrounded.latest.visibility = "hidden";
const stillBackgroundedEvaluation = evaluateThreeOsmAcceptanceSession(
  stillBackgrounded,
  start + THREE_OSM_ACCEPTANCE_MIN_DURATION_MS,
);
assert.equal(stillBackgroundedEvaluation.status, "incomplete");
assert.equal(
  stillBackgroundedEvaluation.gates.find(
    (gate) => gate.id === "background-recovery",
  )?.status,
  "pending",
);

console.log("threeOsmAcceptanceModel.test.ts ok");
