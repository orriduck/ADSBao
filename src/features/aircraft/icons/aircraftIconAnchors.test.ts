import assert from "node:assert/strict";

import { AIRCRAFT_ICON_ANCHORS } from "./aircraftIconAnchors.generated";

const iconNames = Object.keys(AIRCRAFT_ICON_ANCHORS);

assert.ok(iconNames.length > 100, "expected the generated anchor map to cover the full icon set");
assert.equal(AIRCRAFT_ICON_ANCHORS.a320.family, "jet");
assert.ok(AIRCRAFT_ICON_ANCHORS.a320.anchors.leftWingTip);
assert.ok(AIRCRAFT_ICON_ANCHORS.a320.anchors.rightWingTip);
assert.ok(AIRCRAFT_ICON_ANCHORS.a320.anchors.noseUnderside);
assert.equal(AIRCRAFT_ICON_ANCHORS.pc12.family, "propeller");
assert.ok(AIRCRAFT_ICON_ANCHORS.pc12.anchors.propeller);
assert.equal(AIRCRAFT_ICON_ANCHORS.h60.family, "rotorcraft");
assert.ok(AIRCRAFT_ICON_ANCHORS.h60.anchors.rotorHub);
