import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  THREE_OSM_ACCEPTANCE_MIN_DURATION_MS,
  buildThreeOsmAcceptanceReport,
  createThreeOsmAcceptanceSession,
  evaluateThreeOsmAcceptanceSession,
  isThreeOsmAcceptanceSession,
  recordThreeOsmAcceptanceBackground,
  recordThreeOsmAcceptanceForeground,
  recordThreeOsmAcceptanceTouch,
  registerThreeOsmAcceptanceRuntime,
  sampleThreeOsmAcceptanceSession,
  setThreeOsmAcceptancePhysicalDeviceAssessment,
  setThreeOsmAcceptanceThermalAssessment,
} from "./threeOsmAcceptanceModel";
import { verifyThreeOsmAcceptanceReport } from "./threeOsmAcceptanceReportModel";

const start = Date.UTC(2026, 7, 29, 16, 0, 0);
const finishedAt = start + THREE_OSM_ACCEPTANCE_MIN_DURATION_MS;

function createPassingReport(tileSource = "licensed-raster") {
  const session = createThreeOsmAcceptanceSession({
    sessionId: "device-session-1",
    route: "/airport/KBOS",
    nowMs: start,
    documentBootId: "document-1",
    device: {
      userAgent: "Mozilla/5.0 (iPhone)",
      platform: "iPhone",
      maxTouchPoints: 5,
      viewportWidth: 390,
      viewportHeight: 844,
      devicePixelRatio: 3,
      physicalIPhoneCandidate: true,
    },
  });
  registerThreeOsmAcceptanceRuntime(session, "runtime-1", start + 1_000);
  setThreeOsmAcceptancePhysicalDeviceAssessment(session, "confirmed", start + 2_000);
  for (let index = 0; index < 10; index += 1) {
    recordThreeOsmAcceptanceTouch(session, start + 3_000 + index);
  }
  recordThreeOsmAcceptanceBackground(session, start + 60_000);
  recordThreeOsmAcceptanceForeground(session, 180, start + 61_000);
  setThreeOsmAcceptanceThermalAssessment(session, "acceptable", finishedAt);
  sampleThreeOsmAcceptanceSession(session, {
    nowMs: finishedAt,
    runtimeId: "runtime-1",
    modeSwitches: 171,
    renderCount: 900,
    renderSceneMaxMs: 180,
    longTaskCount: 3,
    longTaskMaxMs: 205,
    textures: 9,
    geometries: 8,
    programs: 9,
    tileCacheSize: 25,
    tilesRequested: 25,
    tilesLoaded: 25,
    tilesFailed: 0,
    contextLosses: 1,
    contextRestores: 1,
    trafficRendered: 250,
    trafficReal: 183,
    trafficSynthetic: 67,
    trafficStressTarget: 250,
    operationalOverlayProfile: "full-operational",
    basemap: "ready",
    tileSource,
    tileSourceOrigin: tileSource === "osm-standard" ? "build" : "runtime",
    tileSourceConfig: "ready",
    visibility: "visible",
    wakeLockStatus: "active",
  });
  return buildThreeOsmAcceptanceReport(session, finishedAt);
}

const configured = verifyThreeOsmAcceptanceReport(createPassingReport(), {
  requireConfiguredTiles: true,
});
assert.equal(configured.valid, true);
assert.equal(configured.accepted, true);
assert.equal(configured.configuredProvider, true);
assert.deepEqual(configured.requirementFailures, []);

const osmReport = createPassingReport("osm-standard");
const osm = verifyThreeOsmAcceptanceReport(osmReport);
assert.equal(osm.valid, true);
assert.equal(osm.accepted, true);
assert.equal(osm.configuredProvider, false);

const osmConfiguredCheck = verifyThreeOsmAcceptanceReport(osmReport, {
  requireConfiguredTiles: true,
});
assert.equal(osmConfiguredCheck.valid, true);
assert.equal(osmConfiguredCheck.accepted, false);
assert.equal(osmConfiguredCheck.requirementFailures.length, 1);

const insufficientCapacityReport = structuredClone(createPassingReport());
insufficientCapacityReport.session.trafficRenderedMax = 249;
insufficientCapacityReport.session.trafficCapacitySamples = 0;
insufficientCapacityReport.session.fullOperationalTrafficCapacitySamples = 0;
insufficientCapacityReport.evaluation = evaluateThreeOsmAcceptanceSession(
  insufficientCapacityReport.session,
  finishedAt,
);
const insufficientCapacityResult = verifyThreeOsmAcceptanceReport(
  insufficientCapacityReport,
);
assert.equal(insufficientCapacityResult.valid, true);
assert.equal(insufficientCapacityResult.accepted, false);
assert.equal(insufficientCapacityResult.evaluation?.status, "failed");
assert.equal(
  insufficientCapacityResult.evaluation?.gates.find(
    (gate) => gate.id === "render-stability",
  )?.status,
  "fail",
);

const missingFullProfileReport = structuredClone(createPassingReport());
missingFullProfileReport.session.fullOperationalOverlaySamples = 0;
missingFullProfileReport.session.fullOperationalTrafficCapacitySamples = 0;
missingFullProfileReport.session.latest.operationalOverlayProfile = "user";
missingFullProfileReport.evaluation = evaluateThreeOsmAcceptanceSession(
  missingFullProfileReport.session,
  finishedAt,
);
const missingFullProfileResult = verifyThreeOsmAcceptanceReport(
  missingFullProfileReport,
);
assert.equal(missingFullProfileResult.valid, true);
assert.equal(missingFullProfileResult.accepted, false);
assert.equal(
  missingFullProfileResult.evaluation?.gates.find(
    (gate) => gate.id === "render-stability",
  )?.status,
  "fail",
);

const tampered = structuredClone(createPassingReport());
tampered.evaluation.status = "failed";
const tamperedResult = verifyThreeOsmAcceptanceReport(tampered);
assert.equal(tamperedResult.valid, false);
assert.equal(
  tamperedResult.issues.includes(
    "The exported evaluation does not match the recomputed gates.",
  ),
  true,
);

const wrongRoute = structuredClone(createPassingReport());
wrongRoute.session.route = "/airport/KJFK";
assert.equal(verifyThreeOsmAcceptanceReport(wrongRoute).valid, false);

const malformedSession = structuredClone(createPassingReport());
delete (malformedSession.session as Partial<typeof malformedSession.session>).device;
assert.equal(isThreeOsmAcceptanceSession(malformedSession.session), false);
assert.equal(verifyThreeOsmAcceptanceReport(malformedSession).valid, false);

const invalidMetric = structuredClone(createPassingReport());
invalidMetric.session.texturesMax = Number.NaN;
assert.equal(isThreeOsmAcceptanceSession(invalidMetric.session), false);

const invalidWakeLockEvidence = structuredClone(createPassingReport());
invalidWakeLockEvidence.session.wakeLock.activeSamples = -1;
assert.equal(isThreeOsmAcceptanceSession(invalidWakeLockEvidence.session), false);

const impossibleCapacityEvidence = structuredClone(createPassingReport());
impossibleCapacityEvidence.session.trafficRenderedMax = 249;
assert.equal(
  isThreeOsmAcceptanceSession(impossibleCapacityEvidence.session),
  false,
);

const impossibleFullOverlayEvidence = structuredClone(createPassingReport());
impossibleFullOverlayEvidence.session.fullOperationalOverlaySamples = 0;
assert.equal(
  isThreeOsmAcceptanceSession(impossibleFullOverlayEvidence.session),
  false,
);

const mismatchedDevice = structuredClone(createPassingReport());
mismatchedDevice.session.device.userAgent = "Mozilla/5.0 (Macintosh)";
assert.equal(isThreeOsmAcceptanceSession(mismatchedDevice.session), false);

const terminalInjection = structuredClone(createPassingReport());
terminalInjection.session.device.platform = "iPhone\nforged gate";
assert.equal(isThreeOsmAcceptanceSession(terminalInjection.session), false);

const providerInjection = structuredClone(createPassingReport());
providerInjection.session.latest.tileSource = "licensed\u001b[31m";
assert.equal(isThreeOsmAcceptanceSession(providerInjection.session), false);

const tempDir = mkdtempSync(join(tmpdir(), "adsbao-acceptance-report-"));
try {
  const configuredPath = join(tempDir, "configured.json");
  const configuredReport = createPassingReport() as ReturnType<
    typeof createPassingReport
  > & { privateSentinel?: string };
  configuredReport.privateSentinel = "MUST_NOT_BE_PRINTED";
  writeFileSync(configuredPath, JSON.stringify(configuredReport));
  const configuredCli = spawnSync(
    "pnpm",
    [
      "exec",
      "tsx",
      "scripts/verify-three-osm-acceptance.ts",
      "--configured-tiles",
      configuredPath,
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.equal(configuredCli.status, 0, configuredCli.stderr);
  assert.match(configuredCli.stdout, /acceptance: passed/);
  assert.match(configuredCli.stdout, /configured provider: yes \(required\)/);
  assert.match(
    configuredCli.stdout,
    /screen awake helper: active; active samples=1; error samples=0 \(not a gate\)/,
  );
  assert.match(
    configuredCli.stdout,
    /traffic capacity: rendered=250; real=183; synthetic=67; target=250; simultaneous samples=1; full-overlay capacity=1 \(render-stability evidence\)/,
  );
  assert.doesNotMatch(configuredCli.stdout, /MUST_NOT_BE_PRINTED/);

  const osmPath = join(tempDir, "osm.json");
  writeFileSync(osmPath, JSON.stringify(osmReport));
  const osmCli = spawnSync(
    "pnpm",
    [
      "exec",
      "tsx",
      "scripts/verify-three-osm-acceptance.ts",
      "--configured-tiles",
      osmPath,
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.equal(osmCli.status, 1);
  assert.match(osmCli.stdout, /integrity: valid/);
  assert.match(osmCli.stdout, /configured provider: no \(required\)/);

  const tamperedPath = join(tempDir, "tampered.json");
  writeFileSync(tamperedPath, JSON.stringify(tampered));
  const tamperedCli = spawnSync(
    "pnpm",
    ["exec", "tsx", "scripts/verify-three-osm-acceptance.ts", tamperedPath],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.equal(tamperedCli.status, 1);
  assert.match(tamperedCli.stdout, /integrity: invalid/);
  assert.match(tamperedCli.stdout, /does not match the recomputed gates/);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

console.log("threeOsmAcceptanceReportModel.test.ts ok");
