import assert from "node:assert/strict";
import {
  aircraftProximityKey,
  airportProximityKey,
  selectAirportProximityHit,
  selectNewlyEnteredAircraft,
} from "./proximityNotificationModel";

// --- selectAirportProximityHit -------------------------------------------

// No airports, or nothing within radius, or a non-positive radius → no hit.
{
  assert.equal(selectAirportProximityHit([], 5), null);
  assert.equal(selectAirportProximityHit(null, 5), null);
  assert.equal(
    selectAirportProximityHit([{ icao: "KPHL", distanceNm: 12 }], 5),
    null,
  );
  assert.equal(
    selectAirportProximityHit([{ icao: "KPHL", distanceNm: 1 }], 0),
    null,
  );
}

// Picks the CLOSEST qualifying airport when several are within radius.
{
  const hit = selectAirportProximityHit(
    [
      { icao: "KPHL", name: "Philadelphia Intl", distanceNm: 4.8 },
      { icao: "KPNE", name: "Northeast Philadelphia", distanceNm: 2.1 },
      { icao: "KTTN", name: "Trenton-Mercer", distanceNm: 40 },
    ],
    5,
  );
  assert.equal(hit?.icao, "KPNE");
  assert.equal(hit?.distanceNm, 2.1);
}

// An airport with no usable identity key is skipped even if in range.
{
  const hit = selectAirportProximityHit(
    [{ icao: "", ident: "", code: "", distanceNm: 1 }],
    5,
  );
  assert.equal(hit, null);
}

// --- selectNewlyEnteredAircraft -------------------------------------------

// First tick: every in-range aircraft is a fresh hit.
{
  const { hits, insideKeys } = selectNewlyEnteredAircraft(
    [
      { hex: "a1b2c3", callsign: "UAL123", distanceNm: 3 },
      { hex: "d4e5f6", callsign: "DAL456", distanceNm: 20 },
    ],
    10,
    new Set(),
  );
  assert.deepEqual(
    hits.map((hit) => hit.callsign),
    ["UAL123"],
  );
  assert.deepEqual([...insideKeys], ["a1b2c3"]);
}

// Second tick, same aircraft still inside → NOT re-notified (no repeat spam
// while it lingers), but a newly-entered second aircraft IS notified.
{
  const previousInside = new Set(["a1b2c3"]);
  const { hits, insideKeys } = selectNewlyEnteredAircraft(
    [
      { hex: "a1b2c3", callsign: "UAL123", distanceNm: 3.5 },
      { hex: "d4e5f6", callsign: "DAL456", distanceNm: 8 },
    ],
    10,
    previousInside,
  );
  assert.deepEqual(
    hits.map((hit) => hit.callsign),
    ["DAL456"],
  );
  assert.deepEqual([...insideKeys].sort(), ["a1b2c3", "d4e5f6"]);
}

// An aircraft that leaves and re-enters radius fires again — insideKeys no
// longer contains it once it drops out, so the next inbound tick is fresh.
{
  const afterLeaving = selectNewlyEnteredAircraft(
    [{ hex: "d4e5f6", callsign: "DAL456", distanceNm: 25 }],
    10,
    new Set(["a1b2c3", "d4e5f6"]),
  );
  assert.deepEqual(afterLeaving.hits, []);
  assert.deepEqual([...afterLeaving.insideKeys], []);

  const reentering = selectNewlyEnteredAircraft(
    [{ hex: "d4e5f6", callsign: "DAL456", distanceNm: 4 }],
    10,
    afterLeaving.insideKeys,
  );
  assert.deepEqual(
    reentering.hits.map((hit) => hit.callsign),
    ["DAL456"],
  );
}

// Falls back to icao24, then callsign, for the dedupe key when hex is absent;
// an aircraft with no usable identity at all is skipped.
{
  assert.equal(aircraftProximityKey({ icao24: "abc123" }), "abc123");
  assert.equal(aircraftProximityKey({ callsign: "N12345" }), "N12345");
  assert.equal(airportProximityKey({ ident: "KPHL" }), "KPHL");

  const { hits } = selectNewlyEnteredAircraft(
    [{ callsign: "", hex: "", icao24: "", distanceNm: 1 }],
    10,
    new Set(),
  );
  assert.deepEqual(hits, []);
}

console.log("proximityNotificationModel.test.ts ok");
