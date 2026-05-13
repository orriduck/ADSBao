import assert from "node:assert/strict";

import { flagEmoji } from "./flag.js";

assert.equal(flagEmoji("US"), "\u{1F1FA}\u{1F1F8}");
assert.equal(flagEmoji("us"), "\u{1F1FA}\u{1F1F8}");
assert.equal(flagEmoji(" GB "), "\u{1F1EC}\u{1F1E7}");
assert.equal(flagEmoji("JP"), "\u{1F1EF}\u{1F1F5}");
assert.equal(flagEmoji(""), "");
assert.equal(flagEmoji(null), "");
assert.equal(flagEmoji(undefined), "");
assert.equal(flagEmoji("USA"), ""); // 3-letter codes are not ISO alpha-2
assert.equal(flagEmoji("U1"), "");
assert.equal(flagEmoji("12"), "");

console.log("flag.test.js: ok");
