import assert from "node:assert/strict";
import {
  buildAirportAircraftChannel,
  buildViewportAircraftChannel,
  normalizeRealtimeChannel,
} from "./realtimeChannels";

{
  assert.deepEqual(buildAirportAircraftChannel("kbos", 42.3656, -71.0096), {
    channel: "airport:KBOS",
    params: {
      lat: 42.3656,
      lon: -71.0096,
      distNm: 40,
    },
  });
}

{
  assert.deepEqual(
    buildViewportAircraftChannel({
      lat: 42.3656,
      lon: -71.0096,
      distNm: 37.8,
    }),
    {
      channel: "viewport:42.4:-71:38",
      params: {
        lat: 42.4,
        lon: -71,
        distNm: 38,
      },
    },
  );
}

{
  const broad = buildViewportAircraftChannel({
    lat: 42.3656,
    lon: -71.0096,
    distNm: 900,
  });
  assert.equal(broad.channel, "viewport:42.4:-71:250");
  assert.equal(broad.params.distNm, 250);
}

{
  assert.equal(normalizeRealtimeChannel("callsign:ual964"), "callsign:UAL964");
  assert.equal(normalizeRealtimeChannel(" aircraft:a1b2c3 "), "aircraft:A1B2C3");
}

console.log("realtimeChannels.test.ts ok");
