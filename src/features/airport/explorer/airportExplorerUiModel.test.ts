import assert from "node:assert/strict";

import { resolveSelectedAirspaceIdForLayerVisibility } from "./airportExplorerUiModel";

assert.equal(
  resolveSelectedAirspaceIdForLayerVisibility({
    showAirspaces: false,
    selectedAirspaceId: "",
    airspaceId: "bos-class-b",
  }),
  "",
);

assert.equal(
  resolveSelectedAirspaceIdForLayerVisibility({
    showAirspaces: true,
    selectedAirspaceId: "",
    airspaceId: "bos-class-b",
  }),
  "bos-class-b",
);

assert.equal(
  resolveSelectedAirspaceIdForLayerVisibility({
    showAirspaces: true,
    selectedAirspaceId: "bos-class-b",
    airspaceId: "bos-class-b",
  }),
  "",
);

console.log("airportExplorerUiModel.test.ts ok");
