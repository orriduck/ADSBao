import assert from "node:assert/strict";
import {
  buildUserLocationVisualTraffic,
  getUserLocationVisualTrafficStatusAnimationKey,
} from "./userLocationVisualTrafficModel";

const userLocation = { lat: 42.3656, lon: -71.0096, headingDeg: 90 };

{
  const traffic = buildUserLocationVisualTraffic({
    userLocation,
    aircraft: [
      {
        icao24: "north",
        callsign: "NORTH1",
        lat: 42.3956,
        lon: -71.0096,
        altitude: 2500,
      },
      {
        icao24: "east",
        callsign: "EAST1",
        lat: 42.3656,
        lon: -70.9796,
        altitude: 2500,
      },
    ],
  });

  assert.equal(traffic.length, 2);
  assert.equal(traffic[0].aircraftId, "east");
  assert.equal(traffic[0].clockHour, 12);
  assert.equal(traffic[0].relativeSide, "ahead");
  assert.equal(traffic[1].aircraftId, "north");
  assert.equal(traffic[1].clockHour, 9);
  assert.equal(traffic[1].relativeSide, "left");
}

{
  const traffic = buildUserLocationVisualTraffic({
    userLocation: { lat: userLocation.lat, lon: userLocation.lon },
    aircraft: [
      {
        icao24: "bearing",
        callsign: "BRG1",
        lat: 42.3656,
        lon: -70.9796,
        altitude: 2500,
      },
    ],
  });

  assert.equal(traffic[0].relativeBearingDeg, null);
  assert.equal(Math.round(traffic[0].bearingDeg), 90);
}

{
  const traffic = buildUserLocationVisualTraffic({
    userLocation,
    aircraft: [
      {
        icao24: "too-far",
        callsign: "FAR",
        lat: 42.4356,
        lon: -71.0096,
        altitude: 3000,
      },
      {
        icao24: "too-high",
        callsign: "HIGH",
        lat: 42.3756,
        lon: -71.0096,
        altitude: 12000,
      },
      {
        icao24: "near-low",
        callsign: "LOW",
        lat: 42.3856,
        lon: -71.0096,
        altitude: 9000,
      },
    ],
  });

  assert.deepEqual(
    traffic.map((item) => item.aircraftId),
    ["near-low"],
  );
}

{
  const traffic = buildUserLocationVisualTraffic({
    userLocation,
    limit: 2,
    aircraft: [
      {
        icao24: "three",
        callsign: "THREE",
        lat: 42.4156,
        lon: -71.0096,
        altitude: 9000,
      },
      {
        icao24: "one",
        callsign: "ONE",
        lat: 42.3756,
        lon: -71.0096,
        altitude: 9000,
      },
      {
        icao24: "two",
        callsign: "TWO",
        lat: 42.3956,
        lon: -71.0096,
        altitude: 9000,
      },
    ],
  });

  assert.deepEqual(
    traffic.map((item) => item.aircraftId),
    ["one", "two"],
  );
}

{
  const sameDistanceKeys = [
    getUserLocationVisualTrafficStatusAnimationKey({
      aircraftId: "same",
      callsign: "SAME1",
      distanceNm: 1.2,
    }),
    getUserLocationVisualTrafficStatusAnimationKey({
      aircraftId: "same",
      callsign: "SAME1",
      distanceNm: 1.2,
    }),
  ];

  assert.equal(sameDistanceKeys[0], sameDistanceKeys[1]);
}

{
  const nearKey = getUserLocationVisualTrafficStatusAnimationKey({
    aircraftId: "moving",
    callsign: "MOVE1",
    distanceNm: 1.2,
  });
  const fartherKey = getUserLocationVisualTrafficStatusAnimationKey({
    aircraftId: "moving",
    callsign: "MOVE1",
    distanceNm: 1.6,
  });

  assert.notEqual(nearKey, fartherKey);
}

console.log("userLocationVisualTrafficModel.test.ts ok");
