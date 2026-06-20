import assert from "node:assert/strict";
import {
  buildNearMeLocationFromCoords,
  normalizeNearMeHeadingDeg,
  resolveNearMeDeviceHeading,
  shouldRefreshNearMeSidebarLocation,
  shouldUpdateNearMeLocation,
  type NearMeLocation,
} from "./nearMeLocationModel";

const baseLocation: NearMeLocation = {
  lat: 42.3656,
  lon: -71.0096,
  accuracyMeters: 12,
  headingDeg: 10,
  updatedAt: 1_000,
};

assert.equal(
  buildNearMeLocationFromCoords({ latitude: Number.NaN, longitude: -71.01 }),
  null,
);

assert.equal(normalizeNearMeHeadingDeg(725), 5);
assert.equal(normalizeNearMeHeadingDeg(-1), null);
assert.equal(resolveNearMeDeviceHeading({ webkitCompassHeading: 725 }), 5);
assert.equal(
  resolveNearMeDeviceHeading({
    absolute: true,
    alpha: 90,
    webkitCompassHeading: 45,
  }),
  45,
);
assert.equal(resolveNearMeDeviceHeading({ absolute: true, alpha: 90 }), 270);
assert.equal(resolveNearMeDeviceHeading({ absolute: false, alpha: 90 }), null);
assert.equal(resolveNearMeDeviceHeading({ absolute: true, alpha: null }), null);

{
  const next = {
    ...baseLocation,
    updatedAt: 2_000,
  };

  assert.equal(shouldUpdateNearMeLocation(baseLocation, next), false);
}

{
  const next = {
    ...baseLocation,
    headingDeg: 15,
    updatedAt: 2_000,
  };

  assert.equal(shouldUpdateNearMeLocation(baseLocation, next), true);
}

{
  const next = {
    ...baseLocation,
    lat: 42.3656,
    lon: -71.009,
    updatedAt: 2_000,
  };

  assert.equal(shouldUpdateNearMeLocation(baseLocation, next), true);
}

{
  const next = {
    ...baseLocation,
    headingDeg: 15,
    updatedAt: 2_000,
  };

  assert.equal(shouldRefreshNearMeSidebarLocation(baseLocation, next), false);
}

{
  const next = {
    ...baseLocation,
    lat: 42.3656,
    lon: -71.009,
    updatedAt: 2_000,
  };

  assert.equal(shouldRefreshNearMeSidebarLocation(baseLocation, next), false);
}

{
  const next = {
    ...baseLocation,
    lat: 42.3656,
    lon: -71.004,
    updatedAt: 2_000,
  };

  assert.equal(shouldRefreshNearMeSidebarLocation(baseLocation, next), true);
}

{
  const previous = {
    ...baseLocation,
    headingDeg: null,
  };
  const next = {
    ...baseLocation,
    headingDeg: 90,
    updatedAt: 2_000,
  };

  assert.equal(shouldUpdateNearMeLocation(previous, next), true);
}

{
  const next = {
    ...baseLocation,
    headingDeg: null,
    updatedAt: 2_000,
  };

  assert.equal(shouldUpdateNearMeLocation(baseLocation, next), false);
}

{
  const previous = {
    ...baseLocation,
    headingDeg: 358,
  };
  const next = {
    ...baseLocation,
    headingDeg: 4,
    updatedAt: 2_000,
  };

  assert.equal(shouldUpdateNearMeLocation(previous, next), true);
}

{
  const previous = {
    ...baseLocation,
    headingDeg: 370,
  };
  const next = {
    ...baseLocation,
    headingDeg: 10,
    updatedAt: 2_000,
  };

  assert.equal(shouldUpdateNearMeLocation(previous, next), false);
}

console.log("nearMeLocationModel.test.ts ok");
