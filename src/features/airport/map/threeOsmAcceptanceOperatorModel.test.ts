import assert from "node:assert/strict";
import test from "node:test";
import { THREE_OSM_ACCEPTANCE_MIN_DURATION_MS } from "./threeOsmAcceptanceModel";
import {
  THREE_OSM_ACCEPTANCE_RESET_CONFIRM_WINDOW_MS,
  canAssessThreeOsmAcceptanceThermal,
  resolveThreeOsmAcceptanceResetAction,
} from "./threeOsmAcceptanceOperatorModel";

test("thermal assessment only unlocks after the full acceptance duration", () => {
  assert.equal(
    canAssessThreeOsmAcceptanceThermal(
      THREE_OSM_ACCEPTANCE_MIN_DURATION_MS - 1,
    ),
    false,
  );
  assert.equal(
    canAssessThreeOsmAcceptanceThermal(THREE_OSM_ACCEPTANCE_MIN_DURATION_MS),
    true,
  );
  assert.equal(canAssessThreeOsmAcceptanceThermal(Number.NaN), false);
});

test("reset requires a second activation inside the confirmation window", () => {
  const first = resolveThreeOsmAcceptanceResetAction({
    armedAtMs: null,
    nowMs: 1_000,
  });
  assert.deepEqual(first, { action: "arm", armedAtMs: 1_000 });
  assert.deepEqual(
    resolveThreeOsmAcceptanceResetAction({
      armedAtMs: first.armedAtMs,
      nowMs: 1_000 + THREE_OSM_ACCEPTANCE_RESET_CONFIRM_WINDOW_MS,
    }),
    { action: "reset", armedAtMs: null },
  );
});

test("expired or clock-reversed reset confirmation arms a fresh window", () => {
  assert.deepEqual(
    resolveThreeOsmAcceptanceResetAction({
      armedAtMs: 1_000,
      nowMs: 1_001 + THREE_OSM_ACCEPTANCE_RESET_CONFIRM_WINDOW_MS,
    }),
    {
      action: "arm",
      armedAtMs: 1_001 + THREE_OSM_ACCEPTANCE_RESET_CONFIRM_WINDOW_MS,
    },
  );
  assert.deepEqual(
    resolveThreeOsmAcceptanceResetAction({ armedAtMs: 1_000, nowMs: 999 }),
    { action: "arm", armedAtMs: 999 },
  );
});
