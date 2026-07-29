import assert from "node:assert/strict";

import {
  buildOnboardFlightHref,
  isOnboardMode,
} from "./onboardModeModel";

assert.equal(isOnboardMode("onboard"), true);
assert.equal(isOnboardMode("ONBOARD"), true);
assert.equal(isOnboardMode("tracking"), false);
assert.equal(buildOnboardFlightHref("  dal 58 "), "/aircraft/DAL58?mode=onboard");
assert.equal(buildOnboardFlightHref(""), "/here");

console.log("onboardModeModel.test.ts ok");
