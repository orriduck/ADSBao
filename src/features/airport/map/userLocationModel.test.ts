import assert from "node:assert/strict";
import {
  resolveNextUserLocationAudioMode,
  resolveUserLocationPulseDiameterPx,
  resolveUserLocationRequest,
  USER_LOCATION_PULSE_RADIUS_METERS,
  USER_LOCATION_MAX_DISTANCE_NM,
} from "./userLocationModel";

const KBOS = { lat: 42.3656, lon: -71.0096 };

{
  assert.equal(
    resolveNextUserLocationAudioMode({ mode: "off", hasLocation: false }),
    "location",
  );
  assert.equal(
    resolveNextUserLocationAudioMode({ mode: "location", hasLocation: true }),
    "location-audio",
  );
  assert.equal(
    resolveNextUserLocationAudioMode({
      mode: "location-audio",
      hasLocation: true,
    }),
    "off",
  );
  assert.equal(
    resolveNextUserLocationAudioMode({
      mode: "location-audio",
      hasLocation: false,
    }),
    "location",
  );
}

{
  const result = resolveUserLocationRequest({
    coords: { latitude: 42.36, longitude: -71.01, accuracy: 18 },
    focalLat: KBOS.lat,
    focalLon: KBOS.lon,
  });

  assert.equal(result.tooFar, false);
  assert.equal(result.location?.lat, 42.36);
  assert.equal(result.location?.lon, -71.01);
  assert.equal(result.location?.accuracyMeters, 18);
  assert.ok((result.distanceNm ?? Infinity) < 1);
}

{
  const result = resolveUserLocationRequest({
    coords: { latitude: 40.6413, longitude: -73.7781, accuracy: 42 },
    focalLat: KBOS.lat,
    focalLon: KBOS.lon,
  });

  assert.equal(result.tooFar, true);
  assert.ok((result.distanceNm ?? 0) > USER_LOCATION_MAX_DISTANCE_NM);
  assert.equal(result.location?.lat, 40.6413);
}

{
  const result = resolveUserLocationRequest({
    coords: { latitude: Number.NaN, longitude: -71.01 },
    focalLat: KBOS.lat,
    focalLon: KBOS.lon,
  });

  assert.equal(result.location, null);
  assert.equal(result.distanceNm, null);
  assert.equal(result.tooFar, false);
}

{
  assert.equal(USER_LOCATION_PULSE_RADIUS_METERS, 11_112);
  assert.equal(
    resolveUserLocationPulseDiameterPx({
      centerPoint: { x: 100, y: 100 },
      radiusPoint: { x: 100, y: 132 },
    }),
    64,
  );
}

{
  assert.equal(
    resolveUserLocationPulseDiameterPx({
      centerPoint: { x: 100, y: 100 },
      radiusPoint: { x: Number.NaN, y: 132 },
    }),
    18,
  );
}

console.log("userLocationModel.test.ts ok");
