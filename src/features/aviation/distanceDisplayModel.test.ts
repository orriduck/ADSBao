import assert from "node:assert/strict";

import { formatNearbyDistanceDisplay } from "./distanceDisplayModel";

{
  const display = formatNearbyDistanceDisplay(9.3);

  assert.deepEqual(display, {
    value: 9,
    unit: "NM",
  });
}

{
  assert.equal(formatNearbyDistanceDisplay(null), null);
  assert.equal(formatNearbyDistanceDisplay("not-a-number"), null);
}

console.log("distanceDisplayModel.test.ts ok");
