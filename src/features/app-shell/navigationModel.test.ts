import assert from "node:assert/strict";

import { setHomeSearchParamCarryover } from "./navigationModel";

assert.equal(setHomeSearchParamCarryover(""), "/");
assert.equal(setHomeSearchParamCarryover("locale=zh-CN"), "/");
assert.equal(setHomeSearchParamCarryover("locate=1"), "/?locate=1");
assert.equal(
  setHomeSearchParamCarryover("?locale=zh-CN&locate=nearby"),
  "/?locate=nearby",
);

console.log("navigationModel.test.ts: ok");
