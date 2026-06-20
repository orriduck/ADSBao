import assert from "node:assert/strict";
import {
  mergeUserLocationHeading,
  resolveUserLocationWatchUpdate,
} from "./userLocationModel";

const KBOS = { lat: 42.3656, lon: -71.0096 };

{
  const result = resolveUserLocationWatchUpdate({
    coords: { latitude: 42.36, longitude: -71.01, accuracy: 18 },
    focalLat: KBOS.lat,
    focalLon: KBOS.lon,
  });

  assert.equal(result.noticeKey, "");
  assert.equal(result.mode, "location");
  assert.equal(result.location?.lat, 42.36);
  assert.equal(result.location?.lon, -71.01);
  assert.equal(result.location?.accuracyMeters, 18);
  assert.equal(result.location?.headingDeg, null);
  assert.equal(result.locationEnabled, true);
}

{
  const result = resolveUserLocationWatchUpdate({
    coords: { latitude: 40.6413, longitude: -73.7781, accuracy: 42 },
    focalLat: KBOS.lat,
    focalLon: KBOS.lon,
  });

  assert.equal(result.location, null);
  assert.equal(result.mode, "location");
  assert.equal(result.noticeKey, "tooFar");
  assert.equal(result.locationEnabled, true);
}

{
  const result = resolveUserLocationWatchUpdate({
    coords: { latitude: 42.36, longitude: -71.01, accuracy: 18, heading: 725 },
    focalLat: KBOS.lat,
    focalLon: KBOS.lon,
  });

  assert.equal(result.noticeKey, "");
  assert.equal(result.mode, "location");
  assert.equal(result.location?.lat, 42.36);
  assert.equal(result.location?.lon, -71.01);
  assert.equal(result.location?.headingDeg, 5);
  assert.equal(result.locationEnabled, true);
}

{
  const result = resolveUserLocationWatchUpdate({
    coords: { latitude: 40.6413, longitude: -73.7781, accuracy: 42 },
    focalLat: KBOS.lat,
    focalLon: KBOS.lon,
  });

  assert.equal(result.location, null);
  assert.equal(result.mode, "location");
  assert.equal(result.noticeKey, "tooFar");
  assert.equal(result.locationEnabled, true);
}

{
  const result = resolveUserLocationWatchUpdate({
    coords: { latitude: Number.NaN, longitude: -71.01 },
    focalLat: KBOS.lat,
    focalLon: KBOS.lon,
  });

  assert.equal(result.location, null);
  assert.equal(result.mode, "off");
  assert.equal(result.noticeKey, "unavailable");
  assert.equal(result.locationEnabled, false);
}

{
  const location = {
    lat: 42.36,
    lon: -71.01,
    accuracyMeters: 18,
    headingDeg: null,
    updatedAt: 1,
  };
  const result = mergeUserLocationHeading(location, 725, 2);

  assert.notEqual(result, location);
  assert.equal(result?.lat, location.lat);
  assert.equal(result?.lon, location.lon);
  assert.equal(result?.headingDeg, 5);
  assert.equal(result?.updatedAt, 2);
}

{
  const location = {
    lat: 42.36,
    lon: -71.01,
    accuracyMeters: 18,
    headingDeg: 5,
    updatedAt: 1,
  };

  assert.equal(mergeUserLocationHeading(location, 365, 2), location);
  assert.equal(mergeUserLocationHeading(location, -1, 2), location);
  assert.equal(mergeUserLocationHeading(null, 90, 2), null);
}

console.log("userLocationModel.test.ts ok");
