import assert from "node:assert/strict";

import {
  getAltitudeFocusMatch,
  getContextTagLabel,
  getMovementTagLabel,
  groupAircraftByAirportContext,
  resolveAircraftContextEmphasis,
} from "./airportContextUiModel.js";

const aircraft = [
  {
    icao24: "over",
    altitude: 34_000,
    airportContext: {
      altitudeBand: "class-a",
      visibilityRole: "dimmed",
      movement: "unknown",
      display: { group: "High / Passing Over", label: "class-a" },
    },
  },
  {
    icao24: "terminal",
    altitude: 4_200,
    airportContext: {
      altitudeBand: "terminal-low",
      visibilityRole: "primary",
      movement: "arrival",
      airspace: { matched: true, label: "70/20" },
      display: { group: "Terminal Flow", label: "B 70/20" },
    },
  },
  {
    icao24: "ground",
    altitude: 0,
    onGround: true,
    airportContext: {
      altitudeBand: "surface-tower",
      visibilityRole: "secondary",
      movement: "unknown",
      display: { group: "Airport Area", label: "Airport area" },
    },
  },
];

const grouped = groupAircraftByAirportContext(aircraft);
assert.deepEqual(
  grouped.map((section) => section.group),
  ["Airport Area", "Terminal Flow", "High / Passing Over"],
);
assert.deepEqual(
  grouped.map((section) => section.aircraft[0].icao24),
  ["ground", "terminal", "over"],
);

assert.equal(getMovementTagLabel(aircraft[1]), "ARR");
assert.equal(getMovementTagLabel(aircraft[0]), "OVER");
assert.equal(getContextTagLabel(aircraft[1]), "70/20");
assert.equal(getContextTagLabel(aircraft[0]), "Class A");

assert.equal(getAltitudeFocusMatch(aircraft[1], "terminal"), "in");
assert.equal(getAltitudeFocusMatch(aircraft[0], "terminal"), "out");
assert.equal(getAltitudeFocusMatch(aircraft[1], "low"), "in");
assert.equal(getAltitudeFocusMatch(aircraft[1], "high"), "out");
assert.equal(getAltitudeFocusMatch(aircraft[0], "overflight"), "in");

assert.deepEqual(
  resolveAircraftContextEmphasis({
    aircraft: aircraft[0],
    altitudeFocus: "all",
    contextEnabled: true,
  }),
  {
    tone: "dimmed",
    opacity: 0.28,
    showLabel: false,
    showTelemetry: false,
  },
);

assert.equal(
  resolveAircraftContextEmphasis({
    aircraft: aircraft[0],
    altitudeFocus: "overflight",
    contextEnabled: true,
  }).tone,
  "dimmed",
);
assert.equal(
  resolveAircraftContextEmphasis({
    aircraft: aircraft[0],
    altitudeFocus: "overflight",
    contextEnabled: true,
  }).showLabel,
  true,
);
assert.equal(
  resolveAircraftContextEmphasis({
    aircraft: aircraft[0],
    altitudeFocus: "terminal",
    contextEnabled: true,
  }).opacity,
  0.18,
);
assert.equal(
  resolveAircraftContextEmphasis({
    aircraft: aircraft[0],
    selected: true,
  }).opacity,
  1,
);
assert.equal(
  resolveAircraftContextEmphasis({
    aircraft: aircraft[0],
    contextEnabled: false,
  }).tone,
  "primary",
);
