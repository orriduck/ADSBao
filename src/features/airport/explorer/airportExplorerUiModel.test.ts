import assert from "node:assert/strict";

import { DEFAULT_AIRPORT_EXPLORER_UI_STATE } from "./airportExplorerUiModel";

assert.equal(
  DEFAULT_AIRPORT_EXPLORER_UI_STATE.showMapLabels,
  false,
);
assert.equal(
  DEFAULT_AIRPORT_EXPLORER_UI_STATE.showRunwayBeams,
  true,
);
assert.equal(
  DEFAULT_AIRPORT_EXPLORER_UI_STATE.showNavaidMarkers,
  false,
);
assert.equal(
  DEFAULT_AIRPORT_EXPLORER_UI_STATE.showAirspaces,
  true,
);

console.log("airportExplorerUiModel.test.ts ok");
