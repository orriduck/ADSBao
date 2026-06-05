import assert from "node:assert/strict";

import {
  COLOR_TOKEN_GROUPS,
  resolveColorTokenVar,
} from "./colorTokenRegistry";

const groupById = new Map(COLOR_TOKEN_GROUPS.map((group) => [group.id, group]));

assert.equal(resolveColorTokenVar("surface", "appBackground"), "var(--atc-surface-app)");
assert.equal(resolveColorTokenVar("text", "primary"), "var(--atc-text-primary)");
assert.equal(resolveColorTokenVar("aviation", "traceLine"), "var(--aviation-trace-line)");
assert.equal(resolveColorTokenVar("airspace", "controlledFill"), "var(--airspace-controlled-fill)");
assert.equal(resolveColorTokenVar("navaidRadio", "frequencyBadge"), "var(--navaid-frequency-badge)");

assert.ok(groupById.get("surface")?.tokens.some((token) => token.name === "mapGlassSurface"));
assert.ok(groupById.get("aviation")?.tokens.some((token) => token.name === "aircraftFallbackPosition"));
assert.ok(groupById.get("airspace")?.tokens.some((token) => token.name === "restrictedWarningFill"));

const allTokenVars = COLOR_TOKEN_GROUPS.flatMap((group) =>
  group.tokens.map((token) => token.cssVar),
);
assert.equal(new Set(allTokenVars).size, allTokenVars.length);
assert.ok(allTokenVars.every((cssVar) => cssVar.startsWith("--")));

console.log("colorTokenRegistry.test.ts ok");
