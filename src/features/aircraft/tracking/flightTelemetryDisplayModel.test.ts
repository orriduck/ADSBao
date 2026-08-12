import assert from "node:assert/strict";

import {
  resolveVerticalState,
  resolveVerticalStateTranslationKey,
  type VerticalState,
} from "./flightTelemetryDisplayModel";

assert.equal(
  resolveVerticalState(500),
  "climbing",
  "positive vertical speed is climbing",
);
assert.equal(
  resolveVerticalState(-500),
  "descending",
  "negative vertical speed is descending",
);
assert.equal(resolveVerticalState(0), "level", "zero vertical speed is level");
assert.equal(
  resolveVerticalState(null),
  "unknown",
  "null vertical speed is unknown",
);
assert.equal(
  resolveVerticalState(undefined),
  "unknown",
  "undefined vertical speed is unknown",
);

for (const state of ["climbing", "descending", "level", "unknown"] as const) {
  assert.equal(
    resolveVerticalStateTranslationKey(state),
    `metrics.verticalState.${state}`,
    `${state} maps to its i18n key`,
  );
}

// Type-level guard: VerticalState only allows the four known states.
const _allStates: VerticalState[] = [
  "climbing",
  "descending",
  "level",
  "unknown",
];

console.log("flightTelemetryDisplayModel.test.ts ok");
