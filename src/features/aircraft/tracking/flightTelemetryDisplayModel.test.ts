import assert from "node:assert/strict";

import {
  formatFlightTelemetryMetric,
  resolveTrackDirectionTranslationKey,
} from "./flightTelemetryDisplayModel";

assert.deepEqual(
  formatFlightTelemetryMetric({ metric: "speed", value: 250, alternate: false }),
  { value: 250, suffix: "kt" },
);

assert.deepEqual(
  formatFlightTelemetryMetric({ metric: "speed", value: 250, alternate: true }),
  { value: 463, suffix: "km/h" },
);

assert.deepEqual(
  formatFlightTelemetryMetric({ metric: "altitude", value: 12345, alternate: true }),
  { value: 3763, suffix: "m" },
);

assert.equal(
  formatFlightTelemetryMetric({
    metric: "altitude",
    value: 0,
    flightPositionSource: "flightaware",
    positionQuality: { kind: "predicted", source: "flightaware" },
  }),
  null,
);

assert.deepEqual(
  formatFlightTelemetryMetric({
    metric: "altitude",
    value: 0,
    onGround: true,
    flightPositionSource: "flightaware",
    positionQuality: { kind: "predicted", source: "flightaware" },
  }),
  { value: 0, suffix: "ft" },
);

assert.deepEqual(
  formatFlightTelemetryMetric({ metric: "verticalSpeed", value: -1200, alternate: true }),
  { value: -366, suffix: "m/min", format: { signDisplay: "exceptZero" } },
);

assert.equal(resolveTrackDirectionTranslationKey(0), "directions.n");
assert.equal(resolveTrackDirectionTranslationKey(23), "directions.ne");
assert.equal(resolveTrackDirectionTranslationKey(91), "directions.e");
assert.equal(resolveTrackDirectionTranslationKey(181), "directions.s");
assert.equal(resolveTrackDirectionTranslationKey(270), "directions.w");
assert.equal(resolveTrackDirectionTranslationKey(359), "directions.n");
assert.equal(resolveTrackDirectionTranslationKey(null), null);

console.log("flightTelemetryDisplayModel.test.ts ok");
