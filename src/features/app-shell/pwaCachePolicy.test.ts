import assert from "node:assert/strict";

import { isAdsbaoNetworkOnlyPath } from "./pwaCachePolicy";

assert.equal(isAdsbaoNetworkOnlyPath("/events/nearby/coordinates/42.36/-71.01"), true);
assert.equal(isAdsbaoNetworkOnlyPath("/events/nearby/callsign/DAL1576?locale=en"), true);
assert.equal(isAdsbaoNetworkOnlyPath("/assets/index.js"), false);

console.log("pwaCachePolicy.test.ts ok");
