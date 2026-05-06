import assert from "node:assert/strict";

import {
  isHttp4xxOr5xx,
  mergeAircraftSnapshots,
  normalizeAdsbAircraft,
} from "./aircraftPositionsModel.js";

const receiveTime = 1_700_000_003_200;
const responseNow = 1_700_000_003_000;

{
  const aircraft = normalizeAdsbAircraft(
    {
      hex: "a1b2c3",
      flight: " DAL123 ",
      lat: 42,
      lon: -71,
      alt_baro: 12000,
      alt_geom: 12100,
      baro_rate: 500,
      geom_rate: 450,
      nav_altitude_mcp: 13000,
      gnd: false,
      gs: 250,
      track: 87,
      seen_pos: 1.25,
    },
    { responseNow, receiveTime },
  );

  assert.equal(aircraft.icao24, "a1b2c3");
  assert.equal(aircraft.callsign, "DAL123");
  assert.equal(aircraft.altitude, 12000);
  assert.equal(aircraft.velocity, 250);
  assert.equal(aircraft.positionTime, 1_700_000_001_750);
  assert.equal(aircraft.receiveTime, receiveTime);
}

{
  const merged = mergeAircraftSnapshots({
    closeJson: {
      now: responseNow,
      ac: [
        { hex: "duplicate", flight: " CLOSE ", lat: 1, lon: 2, gs: 10 },
        { hex: "near", flight: " NEAR ", lat: 3, lon: 4 },
      ],
    },
    wideJson: {
      now: responseNow,
      ac: [
        { hex: "duplicate", flight: " WIDE ", lat: 5, lon: 6, gs: 20 },
        { hex: "missing", flight: "SKIP", lat: null, lon: 9 },
      ],
    },
    receiveTime,
  });

  assert.deepEqual(
    merged.map((item) => item.icao24),
    ["duplicate", "near"],
  );
  assert.equal(merged[0].callsign, "WIDE");
  assert.equal(merged[0].velocity, 20);
}

assert.equal(isHttp4xxOr5xx({ status: 500 }), true);
assert.equal(isHttp4xxOr5xx({ statusCode: 404 }), true);
assert.equal(isHttp4xxOr5xx(new Error("HTTP 429")), true);
assert.equal(isHttp4xxOr5xx(new Error("network timeout")), false);
