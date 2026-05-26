import assert from "node:assert/strict";

import {
  resolveAircraftTraceNotificationMode,
} from "./aircraftTraceNotificationModel.js";

assert.equal(resolveAircraftTraceNotificationMode(), true);
assert.equal(
  resolveAircraftTraceNotificationMode({ notifyInitialFetch: false }),
  false,
);
assert.equal(
  resolveAircraftTraceNotificationMode({ notifyInitialFetch: true }),
  true,
);

console.log("aircraftTraceNotificationModel.test.js ok");
