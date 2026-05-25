import assert from "node:assert/strict";

import { fetchTrackedAircraftByCallsign } from "./aircraftCallsign.mechanism.js";
import { ADSB_LOL, AIRPLANES_LIVE } from "../../aviation/aircraftDataProviders.js";

const providerPayload = (source, ac) => ({
  provider: source === ADSB_LOL.id ? ADSB_LOL : AIRPLANES_LIVE,
  payload: { now: 1779678000, ac, source },
});

const freshAircraft = {
  hex: "a1b2c3",
  flight: "AAL100",
  lat: 42.1,
  lon: -71.1,
  seen_pos: 12,
  gs: 470,
  track: 80,
};

const staleAircraft = {
  ...freshAircraft,
  lat: 41,
  lon: -70,
  seen_pos: 180,
};

{
  let flightAwareCalls = 0;
  const result = await fetchTrackedAircraftByCallsign({
    callsign: "AAL100",
    featureEnabled: true,
    fetchPrimaryProviders: async () => [
      providerPayload(ADSB_LOL.id, [freshAircraft]),
      providerPayload(AIRPLANES_LIVE.id, []),
    ],
    getFlightAwareFallback: async () => {
      flightAwareCalls += 1;
      return null;
    },
  });

  assert.equal(result.source, ADSB_LOL.id);
  assert.equal(result.payload.ac[0].lat, 42.1);
  assert.equal(result.payload.ac[0].positionQuality.source, "adsb_lol");
  assert.equal(flightAwareCalls, 0);
}

{
  let flightAwareCalls = 0;
  const result = await fetchTrackedAircraftByCallsign({
    callsign: "AAL100",
    featureEnabled: true,
    fetchPrimaryProviders: async () => [
      providerPayload(ADSB_LOL.id, [staleAircraft]),
      providerPayload(AIRPLANES_LIVE.id, []),
    ],
    getFlightAwareFallback: async () => {
      flightAwareCalls += 1;
      return {
        ok: true,
        hasPosition: true,
        raw: { should: "stay-server-side" },
        position: {
          lat: 47.4167,
          lon: -46.5833,
          altitudeFt: 38000,
          groundSpeedKt: 500,
          trackDeg: 77,
          callsign: "AAL100",
          quality: {
            source: "flightaware",
            kind: "predicted",
            isEstimated: false,
            isPredicted: true,
            fetchedAt: "2026-05-25T03:00:00.000Z",
          },
        },
      };
    },
  });

  assert.equal(result.source, "flightaware");
  assert.equal(result.payload.ac[0].lat, 47.4167);
  assert.equal(result.payload.ac[0].positionQuality.source, "flightaware");
  assert.equal(result.payload.ac[0].positionQuality.kind, "predicted");
  assert.equal(result.payload.trackingState.status, "flightaware_active");
  assert.equal("raw" in result.payload.flightAwareFallback, false);
  assert.equal(flightAwareCalls, 1);
}

{
  let flightAwareCalls = 0;
  const result = await fetchTrackedAircraftByCallsign({
    callsign: "AAL100",
    featureEnabled: false,
    fetchPrimaryProviders: async () => [
      providerPayload(ADSB_LOL.id, [staleAircraft]),
      providerPayload(AIRPLANES_LIVE.id, []),
    ],
    getFlightAwareFallback: async () => {
      flightAwareCalls += 1;
      return null;
    },
  });

  assert.equal(result.source, ADSB_LOL.id);
  assert.equal(result.payload.ac[0].positionQuality.kind, "stale");
  assert.equal(result.payload.trackingState.status, "stale");
  assert.equal(flightAwareCalls, 0);
}

{
  let flightAwareCalls = 0;
  const result = await fetchTrackedAircraftByCallsign({
    callsign: "AAL100",
    fetchPrimaryProviders: async () => [
      providerPayload(ADSB_LOL.id, [staleAircraft]),
      providerPayload(AIRPLANES_LIVE.id, []),
    ],
    getFlightAwareFallback: async () => {
      flightAwareCalls += 1;
      return {
        ok: true,
        hasPosition: true,
        position: {
          lat: 47.4167,
          lon: -46.5833,
          callsign: "AAL100",
          quality: {
            source: "flightaware",
            kind: "predicted",
            fetchedAt: "2026-05-25T03:00:00.000Z",
          },
        },
      };
    },
  });

  assert.equal(result.source, ADSB_LOL.id);
  assert.equal(result.payload.ac[0].positionQuality.kind, "stale");
  assert.equal(flightAwareCalls, 0);
}

{
  const result = await fetchTrackedAircraftByCallsign({
    callsign: "AAL100",
    featureEnabled: true,
    fetchPrimaryProviders: async () => [
      providerPayload(ADSB_LOL.id, [staleAircraft]),
      providerPayload(AIRPLANES_LIVE.id, []),
    ],
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
          fetchedAt: "2026-05-25T03:00:00.000Z",
        },
      },
    }),
  });

  assert.equal(result.source, ADSB_LOL.id);
  assert.equal(result.payload.ac[0].lat, 41);
  assert.equal(result.payload.ac[0].positionQuality.kind, "stale");
  assert.equal(result.payload.trackingState.status, "flightaware_terminal");
}

console.log("trackedAircraftCallsignFallback.test.js ok");
