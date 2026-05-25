import assert from "node:assert/strict";

import {
  FLIGHTAWARE_ROUTE_DASH_ARRAY,
  buildFlightAwareRouteLayerStyles,
} from "./flightAwareRouteArcStyleModel.js";

{
  const styles = buildFlightAwareRouteLayerStyles({
    theme: "dark",
    opacity: 1,
  });

  assert.equal(FLIGHTAWARE_ROUTE_DASH_ARRAY, "10 12");
  assert.equal(styles.glow.dashArray, FLIGHTAWARE_ROUTE_DASH_ARRAY);
  assert.equal(styles.route.dashArray, FLIGHTAWARE_ROUTE_DASH_ARRAY);
  assert.ok(styles.glow.weight > styles.route.weight);
}

{
  const styles = buildFlightAwareRouteLayerStyles({
    theme: "light",
    opacity: 0.5,
  });

  assert.equal(styles.glow.dashArray, FLIGHTAWARE_ROUTE_DASH_ARRAY);
  assert.equal(styles.route.dashArray, FLIGHTAWARE_ROUTE_DASH_ARRAY);
  assert.equal(styles.glow.opacity, 0.09);
  assert.equal(styles.route.opacity, 0.29);
}

console.log("flightAwareRouteArcStyleModel.test.js ok");
