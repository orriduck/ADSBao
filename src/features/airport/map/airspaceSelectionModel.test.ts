import assert from "node:assert/strict";

import {
  resolveAirspaceClientPoint,
  resolveClickedAirspaceId,
  shouldHandleAirspaceSelection,
} from "./airspaceSelectionModel";

const baseFeature = {
  type: "Feature",
  properties: { id: "base" },
  geometry: {
    type: "Polygon",
    coordinates: [[
      [-72, 42],
      [-70, 42],
      [-70, 44],
      [-72, 44],
      [-72, 42],
    ]],
  },
};

const innerFeature = {
  type: "Feature",
  properties: { id: "inner" },
  geometry: {
    type: "Polygon",
    coordinates: [[
      [-71.5, 42.5],
      [-70.5, 42.5],
      [-70.5, 43.5],
      [-71.5, 43.5],
      [-71.5, 42.5],
    ]],
  },
};

{
  const point = resolveAirspaceClientPoint({
    changedTouches: [{ clientX: 41, clientY: 72 }],
  });

  assert.deepEqual(point, { x: 41, y: 72 });
}

{
  const point = resolveAirspaceClientPoint({
    clientX: 120,
    clientY: 240,
  });

  assert.deepEqual(point, { x: 120, y: 240 });
}

{
  const id = resolveClickedAirspaceId({
    hitIds: [],
    features: [baseFeature, innerFeature],
    latlng: { lat: 43, lng: -71 },
    clickedId: "",
    selectableAirspaceIds: new Set(["base", "inner"]),
    selectedAirspaceId: "",
  });

  assert.equal(id, "inner");
}

assert.equal(
  shouldHandleAirspaceSelection({
    visible: false,
    onSelectAirspace: () => {},
  }),
  false,
);
assert.equal(
  shouldHandleAirspaceSelection({
    visible: true,
    onSelectAirspace: null,
  }),
  false,
);
assert.equal(
  shouldHandleAirspaceSelection({
    visible: true,
    onSelectAirspace: () => {},
  }),
  true,
);

console.log("airspaceSelectionModel.test.ts ok");
