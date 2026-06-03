import assert from "node:assert/strict";

import {
  buildFlightAwareRouteLayerStyles,
} from "./flightAwareRouteArcStyleModel";

{
  const styles = buildFlightAwareRouteLayerStyles({
    theme: "dark",
    opacity: 1,
  });

  assert.equal(styles.glow.dashArray, "10 12");
  assert.equal(styles.route.dashArray, "10 12");
  assert.ok(styles.glow.weight > styles.route.weight);
}

{
  const styles = buildFlightAwareRouteLayerStyles({
    theme: "light",
    opacity: 0.5,
  });

  assert.equal(styles.glow.dashArray, "10 12");
  assert.equal(styles.route.dashArray, "10 12");
  assert.equal(styles.glow.opacity, 0.09);
  assert.equal(styles.route.opacity, 0.29);
}

console.log("flightAwareRouteArcStyleModel.test.ts ok");
