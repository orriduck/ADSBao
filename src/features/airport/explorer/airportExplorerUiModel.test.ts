import assert from "node:assert/strict";

import {
  normalizeAirspaceSelectionIds,
  resolveAirspaceSelectionForLayerVisibility,
  resolveSelectedAirspaceIdForLayerVisibility,
} from "./airportExplorerUiModel";

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
  "bos-class-b",
);

assert.deepEqual(
  normalizeAirspaceSelectionIds(["inner", "base", "inner", ""]),
  ["inner", "base"],
);

assert.deepEqual(
  resolveAirspaceSelectionForLayerVisibility({
    showAirspaces: true,
    selectedAirspaceId: "inner",
    airspaceIds: ["base", "inner"],
  }),
  {
    selectedAirspaceId: "inner",
    selectedAirspaceIds: ["base", "inner"],
  },
);

assert.deepEqual(
  resolveAirspaceSelectionForLayerVisibility({
    showAirspaces: false,
    selectedAirspaceId: "inner",
    airspaceIds: ["base", "inner"],
  }),
  {
    selectedAirspaceId: "",
    selectedAirspaceIds: [],
  },
);

console.log("airportExplorerUiModel.test.ts ok");
