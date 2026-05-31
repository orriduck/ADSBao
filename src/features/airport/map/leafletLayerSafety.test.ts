import assert from "node:assert/strict";

import { safeAddToMap, safeRemoveFromMap } from "./leafletLayerSafety";

{
  const layer = {
    addedTo: null,
    addTo(map) {
      this.addedTo = map;
      return this;
    },
  };
  const map = { id: "map" };

  assert.equal(safeAddToMap(layer, map, { label: "test-layer" }), layer);
  assert.equal(layer.addedTo, map);
}

{
  const warnings = [];
  const layer = {
    addTo() {
      throw new Error("Cannot read properties of undefined (reading 'appendChild')");
    },
  };

  assert.equal(
    safeAddToMap(layer, {}, {
      label: "test-layer",
      logger: { warn: (...args) => warnings.push(args) },
    }),
    null,
  );
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0][0], "[test-layer] addTo skipped (map not ready)");
}

{
  let removedFrom = null;
  const layer = {
    removeFrom(map) {
      removedFrom = map;
    },
  };
  const map = { id: "map" };

  safeRemoveFromMap(layer, map);
  assert.equal(removedFrom, map);
  assert.doesNotThrow(() => safeRemoveFromMap(null, map));
}
