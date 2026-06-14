import assert from "node:assert/strict";

import { resolveTrackedFlightPosition } from "./trackedFlightPositionResolver";

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
    altitudeFt: 0,
    groundSpeedKt: 510,
    quality: {
      source: "flightaware",
      kind: "predicted",
      isEstimated: false,
      isPredicted: true,
      fetchedAt: new Date(now).toISOString(),
    },
  },
};

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
  assert.equal(
    resolved.position.positionQuality.sourceUpdatedAt,
    "2026-05-25T02:59:48.000Z",
  );
  assert.equal(flightAwareCalls, 0);
}

{
  const resolved = await resolveTrackedFlightPosition({
    adsbLolPosition: primary("adsb.lol", 120, { lat: 41 }),
    airplanesLivePosition: primary("airplanes.live", 90, { lat: 42 }),
    adsbFiPosition: primary("adsb.fi", 8, { lat: 43 }),
    getFlightAwareFallback: async () => flightAware,
    callsign: "AAL100",
    featureEnabled: true,
    now,
  });

  assert.equal(resolved.source, "adsb.fi");
  assert.equal(resolved.position.lat, 43);
  assert.equal(resolved.position.positionQuality.source, "adsb_fi");
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
  assert.equal(resolved.position.alt_baro, null);
  assert.equal(resolved.trackingState.status, "flightaware_active");
}

{
  let flightAwareCalls = 0;
  const resolved = await resolveTrackedFlightPosition({
    adsbLolPosition: null,
    airplanesLivePosition: primary("airplanes.live", 600, {
      type: "adsc",
      alt_baro: 35000,
      gs: 510,
    }),
    getFlightAwareFallback: async () => {
      flightAwareCalls += 1;
      return null;
    },
    callsign: "UAL964",
    featureEnabled: false,
    now,
  });

  assert.equal(resolved.source, "airplanes.live");
  assert.equal(resolved.position.positionQuality.kind, "oceanic");
  assert.equal(resolved.position.positionQuality.flight_position_source, "adsc");
  assert.equal(
    resolved.position.positionQuality.sourceUpdatedAt,
    "2026-05-25T02:50:00.000Z",
  );
  assert.equal(resolved.trackingState.status, "oceanic_adsc");
  assert.equal(resolved.trackingState.active, true);
  assert.equal(flightAwareCalls, 0);
}

{
  const resolved = await resolveTrackedFlightPosition({
    adsbLolPosition: null,
    airplanesLivePosition: primary("airplanes.live", 12, {
      type: "adsc",
      alt_baro: 35000,
      gs: 510,
    }),
    callsign: "UAL964",
    featureEnabled: false,
    now,
  });

  assert.equal(resolved.source, "airplanes.live");
  assert.equal(resolved.position.positionQuality.kind, "oceanic");
  assert.equal(resolved.position.positionQuality.flight_position_source, "adsc");
  assert.equal(resolved.trackingState.status, "oceanic_adsc");
}

{
  const resolved = await resolveTrackedFlightPosition({
    adsbLolPosition: null,
    airplanesLivePosition: primary("airplanes.live", 600, {
      type: "adsc",
      alt_baro: 35000,
      gs: 510,
    }),
    getFlightAwareFallback: async () => flightAware,
    callsign: "UAL964",
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
    adsbLolPosition: null,
    airplanesLivePosition: primary("airplanes.live", 1_200, {
      type: "adsc",
      alt_baro: 35000,
      gs: 510,
    }),
    callsign: "UAL964",
    featureEnabled: false,
    now,
  });

  assert.equal(resolved.source, "airplanes.live");
  assert.equal(resolved.position.positionQuality.kind, "stale");
  assert.equal(
    resolved.position.positionQuality.sourceUpdatedAt,
    "2026-05-25T02:40:00.000Z",
  );
  assert.equal(resolved.trackingState.status, "stale");
}

{
  const resolved = await resolveTrackedFlightPosition({
    adsbLolPosition: null,
    airplanesLivePosition: null,
    localProjection: {
      lat: 40,
      lon: -70,
      callsign: "AAL100",
    },
    callsign: "AAL100",
    featureEnabled: false,
    now,
  });

  assert.equal(resolved.source, "local_projection");
  assert.equal(
    resolved.position.positionQuality.sourceUpdatedAt,
    "2026-05-25T03:00:00.000Z",
  );
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
  assert.equal(
    resolved.position.positionQuality.sourceUpdatedAt,
    "2026-05-25T02:55:00.000Z",
  );
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
