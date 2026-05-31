import assert from "node:assert/strict";

import {
  isHttp4xxOr5xx,
  normalizeAdsbAircraft,
  normalizeAircraftSnapshot,
  resolveLastSuccessfulPositionDate,
} from "./aircraftPositionsModel";

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
      t: "b738",
      category: "a3",
    },
    { responseNow, receiveTime },
  );

  assert.equal(aircraft.icao24, "a1b2c3");
  assert.equal(aircraft.callsign, "DAL123");
  assert.equal(aircraft.altitude, 12000);
  assert.equal(aircraft.velocity, 250);
  assert.equal(aircraft.type, "B738");
  assert.equal(aircraft.category, "A3");
  assert.equal(aircraft.positionTime, 1_700_000_001_750);
  assert.equal(aircraft.receiveTime, receiveTime);
}

{
  // type / category default to empty strings when adsb.lol omits them.
  const aircraft = normalizeAdsbAircraft(
    { hex: "abc", lat: 1, lon: 2 },
    { responseNow, receiveTime },
  );
  assert.equal(aircraft.type, "");
  assert.equal(aircraft.category, "");
}

{
  const normalized = normalizeAircraftSnapshot({
    json: {
      now: responseNow,
      ac: [
        { hex: "wide", flight: " WIDE ", lat: 5, lon: 6, gs: 20 },
        { hex: "near", flight: " NEAR ", lat: 3, lon: 4 },
        { hex: "missing", flight: "SKIP", lat: null, lon: 9 },
        { flight: "NOHEX", lat: 7, lon: 8 },
      ],
    },
    receiveTime,
  });

  assert.deepEqual(
    normalized.map((item) => item.icao24),
    ["wide", "near"],
  );
  assert.equal(normalized[0].callsign, "WIDE");
  assert.equal(normalized[0].velocity, 20);
  assert.equal(normalized[0].positionTime, responseNow);
}

assert.equal(isHttp4xxOr5xx({ status: 500 }), true);
assert.equal(isHttp4xxOr5xx({ statusCode: 404 }), true);
assert.equal(isHttp4xxOr5xx(new Error("HTTP 429")), true);
assert.equal(isHttp4xxOr5xx(new Error("network timeout")), false);

{
  const result = resolveLastSuccessfulPositionDate([
    { positionTime: 1_700_000_001_000, receiveTime: 1_700_000_010_000 },
    { positionTime: 1_700_000_004_000, receiveTime: 1_700_000_011_000 },
  ]);

  assert.equal(result?.getTime(), 1_700_000_004_000);
}

{
  const result = resolveLastSuccessfulPositionDate({
    positionTime: 1_700_000_004_000,
    receiveTime: 1_700_000_020_000,
    positionQuality: {
      source: "flightaware",
      sourceUpdatedAt: "2026-05-25T15:00:12.000Z",
      fetchedAt: "2026-05-25T15:01:40.000Z",
    },
  });

  assert.equal(result?.toISOString(), "2026-05-25T15:00:12.000Z");
}

{
  assert.equal(resolveLastSuccessfulPositionDate([]), null);
  assert.equal(resolveLastSuccessfulPositionDate({ receiveTime }), null);
}
