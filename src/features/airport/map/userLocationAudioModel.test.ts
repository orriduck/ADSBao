import assert from "node:assert/strict";
import {
  buildAircraftProximityAudioCue,
  USER_LOCATION_AIRCRAFT_ALERT_RANGE_NM,
  USER_LOCATION_AIRCRAFT_ALERT_RANGE_METERS,
} from "./userLocationAudioModel";

const userLocation = { lat: 42.3656, lon: -71.0096 };

{
  assert.equal(USER_LOCATION_AIRCRAFT_ALERT_RANGE_NM, 6);
  assert.equal(USER_LOCATION_AIRCRAFT_ALERT_RANGE_METERS, 11_112);
}

{
  const cue = buildAircraftProximityAudioCue({
    userLocation,
    aircraft: [
      {
        icao24: "far",
        callsign: "FAR1",
        lat: 42.3656,
        lon: -70.89,
        altitude: 0,
      },
      {
        icao24: "near",
        callsign: "NEAR1",
        lat: 42.3656,
        lon: -71.0096,
        altitude: 6000,
      },
    ],
  });

  assert.equal(cue?.aircraftId, "near");
  assert.ok((cue?.distanceNm ?? Infinity) < 1.1);
  assert.ok((cue?.intervalMs ?? Infinity) < 700);
  assert.ok((cue?.toneHz ?? 0) > 900);
}

{
  const farCue = buildAircraftProximityAudioCue({
    userLocation,
    aircraft: [
      {
        icao24: "far",
        callsign: "FAR1",
        lat: 42.3656,
        lon: -70.89,
        altitude: 0,
      },
    ],
  });

  assert.equal(farCue?.aircraftId, "far");
  assert.ok((farCue?.distanceNm ?? 0) < USER_LOCATION_AIRCRAFT_ALERT_RANGE_NM);
  assert.ok((farCue?.intervalMs ?? 0) > 1800);
}

{
  assert.equal(
    buildAircraftProximityAudioCue({
      userLocation,
      aircraft: [
        {
          icao24: "outside",
          callsign: "OUT1",
          lat: 42.3656,
          lon: -70.75,
          altitude: 0,
        },
      ],
    }),
    null,
  );
}

{
  assert.equal(
    buildAircraftProximityAudioCue({
      userLocation,
      aircraft: [
        {
          icao24: "ground",
          callsign: "GROUND1",
          lat: 42.3656,
          lon: -71.0096,
          altitude: 0,
          onGround: true,
        },
      ],
    }),
    null,
  );
}

console.log("userLocationAudioModel.test.ts ok");
