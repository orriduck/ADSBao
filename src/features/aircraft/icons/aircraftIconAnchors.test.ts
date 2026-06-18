import assert from "node:assert/strict";

import { resolveAircraftIconAnchorRecord } from "./aircraftIconAnchors";

const a320 = resolveAircraftIconAnchorRecord("a320");
const pc12 = resolveAircraftIconAnchorRecord("pc12");
const h60 = resolveAircraftIconAnchorRecord("h60");
const balloon = resolveAircraftIconAnchorRecord("ball");

assert.equal(a320?.family, "jet");
assert.ok(a320?.anchors.leftWingTip);
assert.ok(a320?.anchors.rightWingTip);
assert.ok(a320?.anchors.noseUnderside);
assert.ok(a320?.anchors.belly);
assert.equal(pc12?.family, "propeller");
assert.ok(pc12?.anchors.propeller);
assert.ok(pc12?.anchors.belly);
assert.equal(h60?.family, "rotorcraft");
assert.ok(h60?.anchors.rotorHub);
assert.ok(h60?.anchors.belly);
assert.equal(balloon?.family, "balloon");
// balloon has no belly — it's a basket instead
assert.ok(balloon?.anchors.basketCenter);
assert.equal(resolveAircraftIconAnchorRecord("not-real"), null);
