import assert from "node:assert/strict";

import {
  ADSB_FRESH_MAX_AGE_SECONDS,
  resolveTrackedFlightPosition,
} from "./trackedFlightPositionResolver";

const now = Date.parse("2026-05-25T03:00:00.000Z");

const primary = (source, ageSeconds, overrides = {}) => ({
  lat: 42.1,
  lon: -71.1,
  callsign: "AAL100",
  seen_pos: ageSeconds,
  source,
  ...overrides,
});

const flightAware = {
  ok: true,
  hasPosition: true,
  position: {
    lat: 47.4167,
    lon: -46.5833,
    callsign: "AAL100",
    quality: {
      source: "flightaware",
      kind: "predicted",
      isEstimated: false,
      isPredicted: true,
      fetchedAt: new Date(now).toISOString(),
    },
  },
};

assert.equal(ADSB_FRESH_MAX_AGE_SECONDS, 60);

{
  let flightAwareCalls = 0;
  const resolved = await resolveTrackedFlightPosition({
    adsbLolPosition: primary("adsb.lol", 12),
    airplanesLivePosition: primary("airplanes.live", 150, { lat: 50 }),
    getFlightAwareFallback: async () => {
      flightAwareCalls += 1;
      return flightAware;
    },
    callsign: "AAL100",
    featureEnabled: true,
    now,
  });

  assert.equal(resolved.source, "adsb.lol");
  assert.equal(resolved.position.lat, 42.1);
  assert.equal(resolved.position.positionQuality.source, "adsb_lol");
  assert.equal(flightAwareCalls, 0);
}

{
  const resolved = await resolveTrackedFlightPosition({
    adsbLolPosition: primary("adsb.lol", 120),
    airplanesLivePosition: null,
    getFlightAwareFallback: async () => flightAware,
    callsign: "AAL100",
    featureEnabled: true,
    now,
  });

  assert.equal(resolved.source, "flightaware");
  assert.equal(resolved.position.lat, 47.4167);
  assert.equal(resolved.position.positionQuality.kind, "predicted");
  assert.equal(resolved.trackingState.status, "flightaware_active");
}

{
  const resolved = await resolveTrackedFlightPosition({
    adsbLolPosition: primary("adsb.lol", 120, { hex: "A1F1A0" }),
    airplanesLivePosition: null,
    getFlightAwareFallback: async () => flightAware,
    callsign: "AAL100",
    featureEnabled: true,
    now,
  });

  assert.equal(resolved.source, "flightaware");
  assert.equal(resolved.position.hex, "A1F1A0");
  assert.equal(resolved.trackingState.status, "flightaware_active");
}

{
  let flightAwareCalls = 0;
  const lastKnown = primary("adsb.lol", 300, { lat: 40, lon: -70 });
  const resolved = await resolveTrackedFlightPosition({
    adsbLolPosition: null,
    airplanesLivePosition: null,
    lastKnown,
    getFlightAwareFallback: async () => {
      flightAwareCalls += 1;
      return {
        ok: false,
        hasPosition: false,
        errorType: "network_failed",
        fetchedAt: new Date(now).toISOString(),
      };
    },
    callsign: "AAL100",
    featureEnabled: true,
    now,
  });

  assert.equal(resolved.source, "last_known");
  assert.equal(resolved.position.lat, 40);
  assert.equal(resolved.position.positionQuality.kind, "stale");
  assert.equal(resolved.trackingState.status, "missing");
  assert.equal(flightAwareCalls, 1);
}

{
  let flightAwareCalls = 0;
  const resolved = await resolveTrackedFlightPosition({
    adsbLolPosition: null,
    airplanesLivePosition: null,
    getFlightAwareFallback: async () => {
      flightAwareCalls += 1;
      return flightAware;
    },
    callsign: "AAL100",
    featureEnabled: false,
    now,
  });

  assert.equal(resolved.position, null);
  assert.equal(resolved.trackingState.status, "missing");
  assert.equal(flightAwareCalls, 0);
}

{
  const resolved = await resolveTrackedFlightPosition({
    adsbLolPosition: primary("adsb.lol", 180, { lat: 40, lon: -70 }),
    airplanesLivePosition: null,
    getFlightAwareFallback: async () => ({
      ok: true,
      hasPosition: true,
      position: {
        lat: 47.4167,
        lon: -46.5833,
        callsign: "AAL100",
        terminal: true,
        status: "arrived",
        quality: {
          source: "flightaware",
          kind: "observed",
          terminal: true,
          status: "arrived",
          fetchedAt: new Date(now).toISOString(),
        },
      },
    }),
    callsign: "AAL100",
    featureEnabled: true,
    now,
  });

  assert.equal(resolved.source, "adsb.lol");
  assert.equal(resolved.position.lat, 40);
  assert.equal(resolved.position.positionQuality.kind, "stale");
  assert.equal(resolved.trackingState.status, "flightaware_terminal");
}

console.log("trackedFlightPositionResolver.test.ts ok");
