import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../../style.css", import.meta.url), "utf8");

assert.doesNotMatch(
  css,
  /\.about-data-source-row\s*\{[^}]*grid-template-columns:\s*11px\s+51px\s+minmax\(0,\s*1fr\)/s,
);
assert.match(
  css,
  /\.about-data-source-row\s*\{[^}]*grid-template-columns:\s*max-content\s+minmax\(0,\s*1fr\)/s,
);

console.log("AboutDataSources.layout.test.ts: ok");
