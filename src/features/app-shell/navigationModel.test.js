import assert from "node:assert/strict";

import { setHomeSearchParamCarryover } from "./navigationModel.js";

assert.equal(setHomeSearchParamCarryover(""), "/");
assert.equal(setHomeSearchParamCarryover("locale=zh-CN"), "/");
assert.equal(setHomeSearchParamCarryover("locate=1"), "/?locate=1");
assert.equal(
  setHomeSearchParamCarryover("?locale=zh-CN&locate=nearby"),
  "/?locate=nearby",
);

console.log("navigationModel.test.js: ok");
