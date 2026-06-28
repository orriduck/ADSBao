import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  computeMetrics,
  replayFixture,
  THRESHOLDS,
  ZOOM_REGIMES,
  type Fixture,
} from "./positionSmoothingHarness";

const dir = resolve(dirname(fileURLToPath(import.meta.url)), "__fixtures__");
const loadJson = (name: string) =>
  JSON.parse(readFileSync(resolve(dir, name), "utf8"));

const manifest: { name: string }[] = loadJson("manifest.json");
const fixtures: Fixture[] = manifest.map((m) => loadJson(`${m.name}.json`));

assert.ok(fixtures.length >= 6, "expected the curated fixture set to be present");
assert.ok(
  fixtures.some((f) => f.category === "slow") &&
    fixtures.some((f) => f.category === "fast") &&
    fixtures.some((f) => f.category === "source-switch"),
  "fixtures must span slow, fast, and source-switch cases",
);

const table: Record<string, unknown>[] = [];
const failures: string[] = [];

for (const fixture of fixtures) {
  for (const regime of ZOOM_REGIMES) {
    const frames = replayFixture(fixture, regime.zoom);
    const m = computeMetrics(fixture, frames, regime.zoom);
    const limit = THRESHOLDS[regime.name];

    const isSlow = fixture.category === "slow";
    table.push({
      callsign: fixture.callsign.trim(),
      category: fixture.category,
      zoom: regime.name,
      jitterP95px: Number(m.steadyJitterPxP95.toFixed(4)),
      reversalPx: isSlow ? Number(m.maxReversalPx.toFixed(4)) : "—",
      lagM: Number(m.lagM.toFixed(1)),
      envM: isSlow ? Number(m.envelopeExceedM.toFixed(3)) : "—",
      srcSwPx: Number(m.sourceSwitchStepPx.toFixed(3)),
      rawStepPx: Number(m.maxRawFixStepPx.toFixed(3)),
    });

    const where = `${fixture.callsign.trim()} (${fixture.category}) @${regime.name}`;
    if (m.steadyJitterPxP95 > limit.steadyJitterPxP95)
      failures.push(`${where}: steady jitter p95 ${m.steadyJitterPxP95.toFixed(4)}px > ${limit.steadyJitterPxP95}px`);
    if (m.lagM > limit.lagM)
      failures.push(`${where}: lag ${m.lagM.toFixed(1)}m > ${limit.lagM}m`);
    // Source switch must never move the marker MORE in one frame than the raw
    // data moved between two fixes (alpha < 1 -> no teleport/discontinuity).
    // Floor of 0.1px so a parked aircraft whose raw fixes move ~millimetres
    // isn't failed on sub-pixel, invisible motion.
    const noTeleportLimit = Math.max(m.maxRawFixStepPx, 0.1);
    if (m.sourceSwitchStepPx > noTeleportLimit + 1e-6)
      failures.push(
        `${where}: source-switch step ${m.sourceSwitchStepPx.toFixed(3)}px exceeds no-teleport limit ${noTeleportLimit.toFixed(3)}px (max raw fix step ${m.maxRawFixStepPx.toFixed(3)}px)`,
      );
    // Slow targets only: no drift opposite/beyond the ADS-B noise envelope.
    if (isSlow) {
      if (m.maxReversalPx > limit.maxReversalPx)
        failures.push(`${where}: reversal ${m.maxReversalPx.toFixed(4)}px > ${limit.maxReversalPx}px`);
      if (m.envelopeExceedM > limit.envelopeExceedM)
        failures.push(
          `${where}: drift ${m.envelopeExceedM.toFixed(3)}m beyond noise envelope > ${limit.envelopeExceedM}m`,
        );
    }
  }
}

// eslint-disable-next-line no-console
console.table(table);

if (failures.length) {
  for (const f of failures) console.error(`  ✗ ${f}`);
  assert.fail(`${failures.length} smoothing metric threshold(s) failed`);
}

console.log(
  `[position-smoothing] ${fixtures.length} fixtures × ${ZOOM_REGIMES.length} zoom regimes — all metrics within thresholds`,
);
