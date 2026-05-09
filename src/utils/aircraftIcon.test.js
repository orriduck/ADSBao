import assert from "node:assert/strict";

import {
  AIRCRAFT_ICON_BASE_PATH,
  AIRCRAFT_ICON_NAMES,
  isKnownAircraftIconName,
  resolveAircraftIcon,
} from "./aircraftIcon.js";

const expectIcon = (aircraft, expectedName, expectedSource) => {
  const result = resolveAircraftIcon(aircraft);
  assert.ok(result, `expected icon for ${JSON.stringify(aircraft)}, got null`);
  assert.equal(
    result.name,
    expectedName,
    `wrong icon name for ${JSON.stringify(aircraft)}`,
  );
  assert.equal(
    result.src,
    `${AIRCRAFT_ICON_BASE_PATH}/${expectedName}`,
    `wrong icon src for ${JSON.stringify(aircraft)}`,
  );
  assert.equal(result.source, expectedSource);
  assert.ok(
    isKnownAircraftIconName(result.name),
    `${result.name} not in canonical icon list`,
  );
};

// Type-designator hits — first match wins, family folding works.
expectIcon({ type: "B738" }, "b737", "type");
expectIcon({ type: "B739" }, "b737", "type");
expectIcon({ type: "B744" }, "b747", "type");
expectIcon({ type: "B748" }, "b747", "type");
expectIcon({ type: "B752" }, "b767", "type"); // 757 → closest narrow-body
expectIcon({ type: "B763" }, "b767", "type");
expectIcon({ type: "B77W" }, "b777", "type");
expectIcon({ type: "B77L" }, "b777", "type");
expectIcon({ type: "B789" }, "b787", "type");
expectIcon({ type: "B78X" }, "b787", "type");

expectIcon({ type: "A319" }, "a320", "type");
expectIcon({ type: "A320" }, "a320", "type");
expectIcon({ type: "A321" }, "a320", "type");
expectIcon({ type: "A20N" }, "a320", "type");
expectIcon({ type: "A21N" }, "a320", "type");
expectIcon({ type: "A19N" }, "a320", "type");
expectIcon({ type: "A332" }, "a330", "type");
expectIcon({ type: "A333" }, "a330", "type");
expectIcon({ type: "A359" }, "a330", "type");
expectIcon({ type: "A35K" }, "a330", "type");
expectIcon({ type: "A346" }, "a340", "type");
expectIcon({ type: "A388" }, "a380", "type");

expectIcon({ type: "MD11" }, "md11", "type");
expectIcon({ type: "DC10" }, "md11", "type");
expectIcon({ type: "MD83" }, "md11", "type");

expectIcon({ type: "C130" }, "c130", "type");

expectIcon({ type: "CRJ9" }, "crjx", "type");
expectIcon({ type: "CRJ2" }, "crjx", "type");
expectIcon({ type: "CRJ" }, "crjx", "type");

expectIcon({ type: "DH8D" }, "dh8a", "type");
expectIcon({ type: "DH8A" }, "dh8a", "type");

expectIcon({ type: "E190" }, "e195", "type");
expectIcon({ type: "E195" }, "e195", "type");
expectIcon({ type: "E175" }, "e195", "type");
expectIcon({ type: "E290" }, "e195", "type");
expectIcon({ type: "E145" }, "erj", "type");
expectIcon({ type: "E135" }, "erj", "type");

expectIcon({ type: "F100" }, "f100", "type");
expectIcon({ type: "FA7X" }, "fa7x", "type");
expectIcon({ type: "F2TH" }, "fa7x", "type");
expectIcon({ type: "GLF5" }, "glf5", "type");
expectIcon({ type: "GLEX" }, "glf5", "type");
expectIcon({ type: "G650" }, "glf5", "type");
expectIcon({ type: "LJ45" }, "learjet", "type");

expectIcon({ type: "C172" }, "cessna", "type");
expectIcon({ type: "C208" }, "cessna", "type");
expectIcon({ type: "C25A" }, "cessna", "type");
expectIcon({ type: "C560" }, "cessna", "type");

expectIcon({ type: "F15" }, "f15", "type");
expectIcon({ type: "F5" }, "f5", "type");
expectIcon({ type: "F11" }, "f11", "type");

// Lowercase / whitespace input still resolves.
expectIcon({ type: " a320 " }, "a320", "type");
expectIcon({ type: "b738" }, "b737", "type");

// Type takes precedence over category.
expectIcon({ type: "A320", category: "A5" }, "a320", "type");

// Category fallback when type is unknown / missing.
expectIcon({ category: "A3" }, "a3", "category");
expectIcon({ category: "A5" }, "a5", "category");
expectIcon({ category: "A7" }, "a7", "category");
expectIcon({ category: "B1" }, "b1", "category");
expectIcon({ type: "ZZZZ", category: "A2" }, "a2", "category");

// Unknown / no-info should not match — the caller falls back to the arrow.
assert.equal(resolveAircraftIcon({}), null);
assert.equal(resolveAircraftIcon({ type: "" }), null);
assert.equal(resolveAircraftIcon({ category: "" }), null);
assert.equal(resolveAircraftIcon({ type: "ZZZZ" }), null);
assert.equal(resolveAircraftIcon({ category: "A0" }), null);
assert.equal(resolveAircraftIcon({ category: "B0" }), null);
assert.equal(resolveAircraftIcon({ category: "C0" }), null);
assert.equal(resolveAircraftIcon({ category: "C1" }), null);

// Allowlist behaviour for the proxy route.
assert.equal(isKnownAircraftIconName("a320"), true);
assert.equal(isKnownAircraftIconName("b737"), true);
assert.equal(isKnownAircraftIconName("cessna"), true);
assert.equal(isKnownAircraftIconName("../etc/passwd"), false);
assert.equal(isKnownAircraftIconName("a320.svg"), false);
assert.equal(isKnownAircraftIconName(""), false);
assert.equal(isKnownAircraftIconName(null), false);

// The base path is same-origin so CSS mask-image works without CORS.
assert.equal(AIRCRAFT_ICON_BASE_PATH.startsWith("/"), true);

// Sanity: the canonical list contains every icon used as a value.
assert.ok(AIRCRAFT_ICON_NAMES.includes("a320"));
assert.ok(AIRCRAFT_ICON_NAMES.includes("c130"));
assert.ok(AIRCRAFT_ICON_NAMES.includes("crjx"));

console.log("aircraftIcon.test.js ok");
