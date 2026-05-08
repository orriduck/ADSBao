import assert from "node:assert/strict";

import { DEFAULT_AIRPORT_EXPLORER_UI_STATE } from "./airportExplorerUiModel.js";

assert.equal(DEFAULT_AIRPORT_EXPLORER_UI_STATE.showRoutingPointBadges, false);
assert.equal(DEFAULT_AIRPORT_EXPLORER_UI_STATE.showRunwayBeams, true);
assert.equal(DEFAULT_AIRPORT_EXPLORER_UI_STATE.showTelemetry, true);
