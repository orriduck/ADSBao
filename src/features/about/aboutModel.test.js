import assert from "node:assert/strict";

import { getDataSourceCountLabel } from "./aboutModel.js";

assert.equal(getDataSourceCountLabel([], "en"), "0 feeds");
assert.equal(getDataSourceCountLabel([{}], "en"), "1 feed");
assert.equal(getDataSourceCountLabel([{}, {}], "en"), "2 feeds");
assert.equal(getDataSourceCountLabel([], "zh-CN"), "0 个来源");
assert.equal(getDataSourceCountLabel([{}], "zh-CN"), "1 个来源");
assert.equal(getDataSourceCountLabel([{}, {}], "zh-CN"), "2 个来源");

console.log("aboutModel.test.js: ok");
