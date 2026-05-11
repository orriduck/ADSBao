import assert from "node:assert/strict";

import { shouldDisableTelemetryForTraffic } from "./airportExplorerUiModel.js";

assert.equal(
  shouldDisableTelemetryForTraffic({ aircraftCount: 50, threshold: 50 }),
  false,
);
assert.equal(
  shouldDisableTelemetryForTraffic({ aircraftCount: 51, threshold: 50 }),
  true,
);
assert.equal(
  shouldDisableTelemetryForTraffic({ aircraftCount: 61, threshold: 60 }),
  true,
);
assert.equal(
  shouldDisableTelemetryForTraffic({ aircraftCount: 80, threshold: 90 }),
  false,
);
assert.equal(
  shouldDisableTelemetryForTraffic({ aircraftCount: Number.NaN, threshold: 50 }),
  false,
);
