import assert from "node:assert/strict";

import { fetchTrackedAircraftByCallsign } from "./aircraftCallsign.mechanism";
import { CALLSIGN_PROVIDER_CHAIN } from "../../aviation/aircraftDataProviders";

const ADSB_LOL_ID = "adsb.lol";
const AIRPLANES_LIVE_ID = "airplanes.live";
const ADSB_LOL_PROVIDER = CALLSIGN_PROVIDER_CHAIN.find(
  (provider) => provider.id === ADSB_LOL_ID,
);
const AIRPLANES_LIVE_PROVIDER = CALLSIGN_PROVIDER_CHAIN.find(
  (provider) => provider.id === AIRPLANES_LIVE_ID,
);

const providerPayload = (source, ac) => ({
  provider: source === ADSB_LOL_ID ? ADSB_LOL_PROVIDER : AIRPLANES_LIVE_PROVIDER,
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
      providerPayload(ADSB_LOL_ID, [freshAircraft]),
      providerPayload(AIRPLANES_LIVE_ID, []),
    ],
    getFlightAwareFallback: async () => {
      flightAwareCalls += 1;
      return null;
    },
  });

  assert.equal(result.source, ADSB_LOL_ID);
  assert.equal(result.payload.ac[0].lat, 42.1);
  assert.equal(result.payload.ac[0].positionQuality.source, "adsb_lol");
  assert.equal(flightAwareCalls, 0);
}

{
  let flightAwareCalls = 0;
  const result = await fetchTrackedAircraftByCallsign({
    callsign: "UAL964",
    featureEnabled: false,
    fetchPrimaryProviders: async () => [
      providerPayload(ADSB_LOL_ID, []),
      providerPayload(AIRPLANES_LIVE_ID, [
        {
          ...freshAircraft,
          flight: "UAL964",
          type: "adsc",
          lat: 51.55,
          lon: -45.6667,
          alt_baro: 35000,
          seen_pos: 600,
        },
      ]),
    ],
    getFlightAwareFallback: async () => {
      flightAwareCalls += 1;
      return null;
    },
  });

  assert.equal(result.source, AIRPLANES_LIVE_ID);
  assert.equal(result.payload.ac[0].positionQuality.kind, "oceanic");
  assert.equal(result.payload.ac[0].positionQuality.flight_position_source, "adsc");
  assert.equal(result.payload.trackingState.status, "oceanic_adsc");
  assert.equal(result.payload.trackingState.active, true);
  assert.equal(flightAwareCalls, 0);
}

{
  let flightAwareCalls = 0;
  const result = await fetchTrackedAircraftByCallsign({
    callsign: "AAL100",
    featureEnabled: true,
    fetchPrimaryProviders: async () => [
      providerPayload(ADSB_LOL_ID, [staleAircraft]),
      providerPayload(AIRPLANES_LIVE_ID, []),
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
      providerPayload(ADSB_LOL_ID, [staleAircraft]),
      providerPayload(AIRPLANES_LIVE_ID, []),
    ],
    getFlightAwareFallback: async () => {
      flightAwareCalls += 1;
      return null;
    },
  });

  assert.equal(result.source, ADSB_LOL_ID);
  assert.equal(result.payload.ac[0].positionQuality.kind, "stale");
  assert.equal(result.payload.trackingState.status, "stale");
  assert.equal(flightAwareCalls, 0);
}

{
  let flightAwareCalls = 0;
  const result = await fetchTrackedAircraftByCallsign({
    callsign: "AAL100",
    fetchPrimaryProviders: async () => [
      providerPayload(ADSB_LOL_ID, [staleAircraft]),
      providerPayload(AIRPLANES_LIVE_ID, []),
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

  assert.equal(result.source, ADSB_LOL_ID);
  assert.equal(result.payload.ac[0].positionQuality.kind, "stale");
  assert.equal(flightAwareCalls, 0);
}

{
  const result = await fetchTrackedAircraftByCallsign({
    callsign: "AAL100",
    featureEnabled: true,
    fetchPrimaryProviders: async () => [
      providerPayload(ADSB_LOL_ID, [staleAircraft]),
      providerPayload(AIRPLANES_LIVE_ID, []),
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

  assert.equal(result.source, ADSB_LOL_ID);
  assert.equal(result.payload.ac[0].lat, 41);
  assert.equal(result.payload.ac[0].positionQuality.kind, "stale");
  assert.equal(result.payload.trackingState.status, "flightaware_terminal");
}

console.log("trackedAircraftCallsignFallback.test.ts ok");
