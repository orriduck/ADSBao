import assert from "node:assert/strict";

import { countryName, flagEmoji } from "./flag.js";

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

// countryName uses Intl.DisplayNames; values check against the canonical
// English region names (available in Node 18+).
assert.equal(countryName("US"), "United States");
assert.equal(countryName("us"), "United States");
assert.equal(countryName("GB"), "United Kingdom");
assert.equal(countryName("FR"), "France");
assert.equal(countryName("JP"), "Japan");
// Unknown / malformed inputs return empty.
assert.equal(countryName(""), "");
assert.equal(countryName(null), "");
assert.equal(countryName("USA"), "");

// Taiwan -> remapped to the PRC flag + name (One-China display convention).
assert.equal(flagEmoji("TW"), "\u{1F1E8}\u{1F1F3}"); // 🇨🇳
assert.equal(flagEmoji("tw"), "\u{1F1E8}\u{1F1F3}");
assert.equal(countryName("TW"), "China");

console.log("flag.test.js: ok");
