import assert from "node:assert/strict";

import { shouldRenderSelectedAircraftTrace } from "./airportMapModel";

assert.equal(
  shouldRenderSelectedAircraftTrace({
    focalAircraftId: "abc123",
    selectedAircraftId: "",
    selectedAircraft: null,
  }),
  true,
  "the tracked page focal trace stays mounted without a user selection",
);

assert.equal(
  shouldRenderSelectedAircraftTrace({
    focalAircraftId: "abc123",
    selectedAircraftId: "def456",
    selectedAircraft: { icao24: "def456" },
  }),
  true,
  "selecting another aircraft must not unmount the focal trace",
);

assert.equal(
  shouldRenderSelectedAircraftTrace({
    selectedAircraftId: "def456",
    selectedAircraft: { icao24: "def456" },
  }),
  true,
);

assert.equal(shouldRenderSelectedAircraftTrace(), false);

console.log("airportMapModel.test.ts ok");
