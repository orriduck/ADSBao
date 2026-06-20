import assert from "node:assert/strict";

import {
  safeAddToMap,
  safeGetMapBounds,
  safeRemoveFromMap,
} from "./leafletLayerSafety";

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
  const warnings: any[] = [];
  const layer = {
    addTo() {
      throw new Error("Cannot read properties of undefined (reading 'appendChild')");
    },
  };

  assert.equal(
    safeAddToMap(layer, {}, {
      label: "test-layer",
      logger: { warn: (...args: any[]) => warnings.push(args) } as any,
    }),
    null,
  );
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0][0], "[test-layer] addTo skipped (map not ready)");
}

{
  const warnings: any[] = [];
  let removeCalls = 0;
  const layer = {
    addTo() {
      throw new Error("Cannot read properties of undefined (reading '_leaflet_pos')");
    },
    remove() {
      removeCalls += 1;
    },
  };

  assert.equal(
    safeAddToMap(layer, {}, {
      label: "trace-layer",
      logger: { warn: (...args: any[]) => warnings.push(args) } as any,
    }),
    null,
  );
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0][0], "[trace-layer] addTo skipped (map not ready)");
  assert.equal(removeCalls, 1);
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

{
  const bounds = { contains: () => true };
  const map = {
    getBounds() {
      return bounds;
    },
  };

  assert.equal(safeGetMapBounds(map), bounds);
}

{
  const warnings: any[] = [];
  const map = {
    getBounds() {
      throw new Error("Cannot read properties of undefined (reading '_leaflet_pos')");
    },
  };

  assert.equal(
    safeGetMapBounds(map, {
      label: "aircraft-layer",
      logger: { warn: (...args: any[]) => warnings.push(args) } as any,
    }),
    null,
  );
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0][0], "[aircraft-layer] bounds skipped (map not ready)");
}
