import assert from "node:assert/strict";
import {
  resolveUserLocationPulseDiameterPx,
  resolveUserLocationWatchUpdate,
  USER_LOCATION_PULSE_RADIUS_METERS,
} from "./userLocationModel";

const KBOS = { lat: 42.3656, lon: -71.0096 };

{
  const result = resolveUserLocationWatchUpdate({
    coords: { latitude: 42.36, longitude: -71.01, accuracy: 18 },
    focalLat: KBOS.lat,
    focalLon: KBOS.lon,
    currentMode: "location",
  });

  assert.equal(result.noticeKey, "");
  assert.equal(result.mode, "location");
  assert.equal(result.location?.lat, 42.36);
  assert.equal(result.location?.lon, -71.01);
  assert.equal(result.location?.accuracyMeters, 18);
}

{
  const result = resolveUserLocationWatchUpdate({
    coords: { latitude: 40.6413, longitude: -73.7781, accuracy: 42 },
    focalLat: KBOS.lat,
    focalLon: KBOS.lon,
    currentMode: "location",
  });

  assert.equal(result.location, null);
  assert.equal(result.mode, "off");
  assert.equal(result.noticeKey, "tooFar");
}

{
  const result = resolveUserLocationWatchUpdate({
    coords: { latitude: 42.36, longitude: -71.01, accuracy: 18 },
    focalLat: KBOS.lat,
    focalLon: KBOS.lon,
    currentMode: "location-audio",
  });

  assert.equal(result.noticeKey, "");
  assert.equal(result.mode, "location-audio");
  assert.equal(result.location?.lat, 42.36);
  assert.equal(result.location?.lon, -71.01);
}

{
  const result = resolveUserLocationWatchUpdate({
    coords: { latitude: 40.6413, longitude: -73.7781, accuracy: 42 },
    focalLat: KBOS.lat,
    focalLon: KBOS.lon,
    currentMode: "location",
  });

  assert.equal(result.location, null);
  assert.equal(result.mode, "off");
  assert.equal(result.noticeKey, "tooFar");
}

{
  const result = resolveUserLocationWatchUpdate({
    coords: { latitude: Number.NaN, longitude: -71.01 },
    focalLat: KBOS.lat,
    focalLon: KBOS.lon,
    currentMode: "location",
  });

  assert.equal(result.location, null);
  assert.equal(result.mode, "off");
  assert.equal(result.noticeKey, "unavailable");
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
