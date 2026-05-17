import assert from "node:assert/strict";
import {
  TRANSLATION_GLOSSARY_ENTRIES,
  groupTranslationGlossaryEntries,
} from "./translationGlossary.js";

const entriesByTerm = new Map(
  TRANSLATION_GLOSSARY_ENTRIES.map((entry) => [entry.source, entry]),
);

assert.equal(entriesByTerm.get("nautical mile")?.zhHans, "海里");
assert.equal(entriesByTerm.get("knot")?.zhHans, "节");
assert.equal(entriesByTerm.get("feet per minute")?.zhHans, "英尺每分钟");
assert.equal(entriesByTerm.get("Ground speed")?.surface, "preview-card");
assert.equal(entriesByTerm.get("Distance")?.surface, "sidebar");
assert.equal(entriesByTerm.get("Map scale")?.surface, "map-scale");
assert.equal(entriesByTerm.get("Scale")?.zhHans, "距离");
assert.equal(entriesByTerm.get("Alt")?.zhHans, "高度");
assert.equal(entriesByTerm.get("Route")?.zhHans, "航路");
assert.equal(entriesByTerm.get("Aircraft type")?.zhHans, "机型");

const grouped = groupTranslationGlossaryEntries(TRANSLATION_GLOSSARY_ENTRIES);
assert.deepEqual(Object.keys(grouped), ["sidebar", "map-scale", "preview-card"]);
assert.ok(grouped.sidebar.length >= 6);
assert.ok(grouped["map-scale"].length >= 3);
assert.ok(grouped["preview-card"].length >= 6);
