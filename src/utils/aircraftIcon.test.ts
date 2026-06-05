import assert from "node:assert/strict";

import {
  isKnownAircraftIconName,
  resolveAircraftIcon,
  resolveAircraftSizeScale,
} from "./aircraftIcon";

const AIRCRAFT_ICON_BASE_PATH = "/api/icons/aircraft";
const AIRCRAFT_BASELINE_SCALE = 1;

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

// Direct ICAO matches — the type designator is its own icon name.
expectIcon({ type: "A320" }, "a320", "type");
expectIcon({ type: "A321" }, "a321", "type");
expectIcon({ type: "A20N" }, "a20n", "type");
expectIcon({ type: "A21N" }, "a21n", "type");
expectIcon({ type: "A19N" }, "a19n", "type");
expectIcon({ type: "B738" }, "b738", "type");
expectIcon({ type: "B739" }, "b739", "type");
expectIcon({ type: "B748" }, "b748", "type");
expectIcon({ type: "B77W" }, "b77w", "type");
expectIcon({ type: "B77L" }, "b77l", "type");
expectIcon({ type: "B789" }, "b789", "type");
expectIcon({ type: "A359" }, "a359", "type");
expectIcon({ type: "A388" }, "a388", "type");
expectIcon({ type: "MD11" }, "md11", "type");
expectIcon({ type: "DC10" }, "dc10", "type");
expectIcon({ type: "CRJ9" }, "crj9", "type");
expectIcon({ type: "CRJ7" }, "crj7", "type");
expectIcon({ type: "DH8D" }, "dh8d", "type");
expectIcon({ type: "C172" }, "c172", "type");

// Lowercase input is normalized.
expectIcon({ type: "b738" }, "b738", "type");
expectIcon({ type: " a359 " }, "a359", "type");

// Family fallbacks for variants not in the set.
expectIcon({ type: "B73G" }, "b737", "type"); // 737 Classic variants
expectIcon({ type: "B73Q" }, "b737", "type");
expectIcon({ type: "B752" }, "b752", "type"); // direct
expectIcon({ type: "B751" }, "b753", "type"); // 757 family -> closest direct
expectIcon({ type: "B764" }, "b764", "type"); // direct
expectIcon({ type: "B767" }, "b763", "type"); // no b767 direct, family -> b763
expectIcon({ type: "A319" }, "a318", "type");
expectIcon({ type: "A322" }, "a320", "type"); // unusual A32x variant
expectIcon({ type: "A350" }, "a359", "type"); // generic A350 token
expectIcon({ type: "A380" }, "a388", "type"); // generic A380 token
expectIcon({ type: "MD83" }, "md11", "type");
expectIcon({ type: "MD90" }, "md11", "type");
expectIcon({ type: "DC9" }, "md11", "type");
expectIcon({ type: "L101" }, "md11", "type");
expectIcon({ type: "CRJX" }, "crjx", "type"); // direct
expectIcon({ type: "DH8A" }, "dh8c", "type"); // family -> closest dash 8
expectIcon({ type: "E170" }, "e170", "type"); // direct
expectIcon({ type: "E175" }, "e170", "type"); // family
expectIcon({ type: "E190" }, "e195", "type");
expectIcon({ type: "E295" }, "e195", "type");
expectIcon({ type: "ERJ" }, "e35l", "type");
expectIcon({ type: "E145" }, "e35l", "type");
expectIcon({ type: "F100" }, "f50", "type");
expectIcon({ type: "F70" }, "f50", "type");
expectIcon({ type: "F2TH" }, "fa7x", "type");
expectIcon({ type: "GLF5" }, "glf6", "type");
expectIcon({ type: "GLEX" }, "glf6", "type");
expectIcon({ type: "G650" }, "glf6", "type");
expectIcon({ type: "LJ60" }, "lj35", "type");
expectIcon({ type: "F-14" }, "f15", "type");
expectIcon({ type: "F-18" }, "f18h", "type");
expectIcon({ type: "C152" }, "c172", "type");
expectIcon({ type: "C525" }, "c25b", "type");

// Category fallback when the aircraft has no resolvable type code. Targets
// are real icons in the new set (no more a1/a2/b1 generic shapes).
expectIcon({ category: "A1" }, "c172", "category");
expectIcon({ category: "A2" }, "c25b", "category");
expectIcon({ category: "A3" }, "a320", "category");
expectIcon({ category: "A4" }, "b753", "category");
expectIcon({ category: "A5" }, "b77w", "category");
expectIcon({ category: "A6" }, "f16", "category");
expectIcon({ category: "A7" }, "h60", "category");
expectIcon({ type: "ZZZZ", category: "A3" }, "a320", "category");

// Type wins over category when both resolve.
expectIcon({ type: "A320", category: "A5" }, "a320", "type");

// Non-airplane categories (gliders / LTA / ground vehicles) -> null so the
// caller draws the arrow / dot.
assert.equal(resolveAircraftIcon({ category: "A0" }), null);
assert.equal(resolveAircraftIcon({ category: "B1" }), null);
assert.equal(resolveAircraftIcon({ category: "B4" }), null);
assert.equal(resolveAircraftIcon({ category: "C2" }), null);

// Unknown / empty -> null.
assert.equal(resolveAircraftIcon({}), null);
assert.equal(resolveAircraftIcon({ type: "" }), null);
assert.equal(resolveAircraftIcon({ type: "ZZZZ" }), null);

// Allowlist behaviour for the proxy route.
assert.equal(isKnownAircraftIconName("a320"), true);
assert.equal(isKnownAircraftIconName("b737"), true);
assert.equal(isKnownAircraftIconName("c172"), true);
assert.equal(isKnownAircraftIconName("unidentified"), true);
assert.equal(isKnownAircraftIconName("cessna"), false); // legacy name retired
assert.equal(isKnownAircraftIconName("../etc/passwd"), false);
assert.equal(isKnownAircraftIconName("a320.svg"), false);
assert.equal(isKnownAircraftIconName(""), false);
assert.equal(isKnownAircraftIconName(null), false);

// The base path is same-origin so CSS mask-image works without CORS.
assert.equal(AIRCRAFT_ICON_BASE_PATH.startsWith("/"), true);

// Sanity: the canonical list covers the major commercial ICAO types.
assert.equal(isKnownAircraftIconName("a320"), true);
assert.equal(isKnownAircraftIconName("b738"), true);
assert.equal(isKnownAircraftIconName("b77w"), true);
assert.equal(isKnownAircraftIconName("crj9"), true);
assert.equal(isKnownAircraftIconName("md11"), true);

// Wake-class scale resolver: A1 small aircraft stay clearly smaller than
// A320-class A3 traffic, while A4/A5 heavies read larger on the map.
assert.equal(resolveAircraftSizeScale({ category: "A1" }), 0.7);
assert.equal(resolveAircraftSizeScale({ category: "A2" }), 0.8);
assert.equal(resolveAircraftSizeScale({ category: "A3" }), 1);
assert.equal(resolveAircraftSizeScale({ category: "A4" }), 1.25);
assert.equal(resolveAircraftSizeScale({ category: "A5" }), 1.45);
assert.equal(resolveAircraftSizeScale({ category: " a5 " }), 1.45);
assert.equal(
  resolveAircraftSizeScale({ category: "A0" }),
  AIRCRAFT_BASELINE_SCALE,
);
assert.equal(
  resolveAircraftSizeScale({ category: "A6" }),
  AIRCRAFT_BASELINE_SCALE,
);
assert.equal(
  resolveAircraftSizeScale({ category: "A7" }),
  AIRCRAFT_BASELINE_SCALE,
);
assert.equal(
  resolveAircraftSizeScale({ category: "B1" }),
  AIRCRAFT_BASELINE_SCALE,
);
assert.equal(
  resolveAircraftSizeScale({ category: "" }),
  AIRCRAFT_BASELINE_SCALE,
);
assert.equal(resolveAircraftSizeScale({}), AIRCRAFT_BASELINE_SCALE);
assert.equal(resolveAircraftSizeScale(), AIRCRAFT_BASELINE_SCALE);
assert.ok(
  resolveAircraftSizeScale({ category: "A5" }) > AIRCRAFT_BASELINE_SCALE,
);
assert.ok(
  resolveAircraftSizeScale({ category: "A1" }) < AIRCRAFT_BASELINE_SCALE,
);
assert.equal(AIRCRAFT_BASELINE_SCALE, 1);

console.log("aircraftIcon.test.ts ok");
