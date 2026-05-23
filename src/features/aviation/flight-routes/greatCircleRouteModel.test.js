import assert from "node:assert/strict";

import { buildGreatCirclePath } from "./greatCircleRouteModel.js";

{
  const path = buildGreatCirclePath({
    from: { lat: 42.36, lon: -71 },
    to: { lat: 51.47, lon: -0.46 },
    segments: 8,
  });

  assert.equal(path.length, 9);
  assert.deepEqual(path[0], [42.36, -71]);
  assert.deepEqual(path.at(-1), [51.47, -0.46]);
  assert.ok(
    path.some(([lat, lon]) => lat > 52 && lon < -20),
    "transatlantic route should bow north instead of drawing a flat straight line",
  );
}

{
  assert.deepEqual(
    buildGreatCirclePath({
      from: { lat: null, lon: -71 },
      to: { lat: 51, lon: -0.4 },
    }),
    [],
  );
}

console.log("greatCircleRouteModel.test.js ok");
