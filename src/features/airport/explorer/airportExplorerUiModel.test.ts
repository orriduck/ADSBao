import assert from "node:assert/strict";

import { DEFAULT_AIRPORT_EXPLORER_UI_STATE } from "./airportExplorerUiModel";

assert.equal(
  DEFAULT_AIRPORT_EXPLORER_UI_STATE.showNavaidMarkers,
  false,
);

console.log("airportExplorerUiModel.test.ts ok");
