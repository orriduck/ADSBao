import assert from "node:assert/strict";

import { getAircraftListAnimationState } from "./aircraftListAnimationModel.js";

{
  const state = getAircraftListAnimationState({
    prevKeys: ["AAL100", "DAL200", "UAL300"],
    currentKeys: ["DAL200", "AAL100", "UAL300"],
    resetKeyChanged: false,
  });

  assert.equal(state.disableSwap, false);
  assert.deepEqual(state.cascadeOrders, [0, 1, -1]);
}

{
  const state = getAircraftListAnimationState({
    prevKeys: ["AAL100", "DAL200"],
    currentKeys: ["AAL100", "DAL200", "UAL300"],
    resetKeyChanged: false,
  });

  assert.equal(state.disableSwap, true);
  assert.deepEqual(state.cascadeOrders, [-1, -1, -1]);
}

{
  const state = getAircraftListAnimationState({
    prevKeys: ["AAL100", "DAL200"],
    currentKeys: ["DAL200", "AAL100"],
    resetKeyChanged: true,
  });

  assert.equal(state.disableSwap, true);
  assert.deepEqual(state.cascadeOrders, [-1, -1]);
}

console.log("aircraftListAnimationModel.test.js ok");
