import assert from "node:assert/strict";

import {
  buildPageNavigationHref,
  setHomeSearchParamCarryover,
} from "./navigationModel";

assert.equal(setHomeSearchParamCarryover(""), "/");
assert.equal(setHomeSearchParamCarryover("locale=zh-CN"), "/");
assert.equal(setHomeSearchParamCarryover("locate=1"), "/?locate=1");
assert.equal(
  setHomeSearchParamCarryover("?locale=zh-CN&locate=nearby"),
  "/?locate=nearby",
);
assert.equal(buildPageNavigationHref("/", "zh-CN"), "/?locale=zh-CN");
assert.equal(buildPageNavigationHref("/about", "zh-CN"), "/about?locale=zh-CN");
assert.equal(
  buildPageNavigationHref("/mechanism", "zh-CN"),
  "/mechanism?locale=zh-CN",
);
assert.equal(
  buildPageNavigationHref("/changelog", "zh-CN"),
  "/changelog?locale=zh-CN",
);

console.log("navigationModel.test.ts: ok");
