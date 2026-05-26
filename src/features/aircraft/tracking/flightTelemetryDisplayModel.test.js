import assert from "node:assert/strict";

import {
  formatFlightTelemetryMetric,
  resolveTrackDirection,
} from "./flightTelemetryDisplayModel.js";

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

assert.deepEqual(
  formatFlightTelemetryMetric({ metric: "verticalSpeed", value: -1200, alternate: true }),
  { value: -366, suffix: "m/min", format: { signDisplay: "exceptZero" } },
);

assert.equal(resolveTrackDirection(0), "N");
assert.equal(resolveTrackDirection(22), "N");
assert.equal(resolveTrackDirection(23), "NE");
assert.equal(resolveTrackDirection(91), "E");
assert.equal(resolveTrackDirection(181), "S");
assert.equal(resolveTrackDirection(270), "W");
assert.equal(resolveTrackDirection(359), "N");
assert.equal(resolveTrackDirection(null), null);

console.log("flightTelemetryDisplayModel.test.js ok");
