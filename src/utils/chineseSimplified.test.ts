import assert from "node:assert/strict";

import { toSimplifiedChinese } from "./chineseSimplified";

// Sanity checks for the inline traditional → simplified converter.
assert.equal(toSimplifiedChinese("臺北市"), "台北市");
assert.equal(toSimplifiedChinese("臺灣"), "台湾");
assert.equal(toSimplifiedChinese("廣州"), "广州");
assert.equal(toSimplifiedChinese("黑龍江省"), "黑龙江省");
assert.equal(toSimplifiedChinese("臺灣省臺北市"), "台湾省台北市");
// Already-simplified strings pass through untouched.
assert.equal(toSimplifiedChinese("上海市"), "上海市");
assert.equal(toSimplifiedChinese("北京市"), "北京市");
// Non-Chinese strings pass through untouched.
assert.equal(toSimplifiedChinese("San Francisco"), "San Francisco");
assert.equal(toSimplifiedChinese(""), "");
assert.equal(toSimplifiedChinese(null), "");

console.log("chineseSimplified.test.ts ok");
