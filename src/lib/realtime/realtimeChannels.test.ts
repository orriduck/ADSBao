import assert from "node:assert/strict";
import {
  buildAircraftTrafficChannel,
  buildAirportTrafficChannel,
  buildCenterTrafficChannel,
  buildRouteChannel,
  normalizeRealtimeChannel,
} from "./realtimeChannels";

{
  assert.deepEqual(buildAirportTrafficChannel("kbos", 42.3656, -71.0096), {
    channel: "traffic:airport:KBOS:42.4:-71:40",
    params: {},
  });
}

{
  assert.deepEqual(
    buildCenterTrafficChannel({
      lat: 42.3656,
      lon: -71.0096,
      distNm: 37.8,
    }),
    {
      channel: "traffic:center:42.4:-71:38",
      params: {},
    },
  );
}

{
  const broad = buildCenterTrafficChannel({
    lat: 42.3656,
    lon: -71.0096,
    distNm: 900,
  });
  assert.equal(broad.channel, "traffic:center:42.4:-71:250");
}

{
  assert.deepEqual(
    buildAircraftTrafficChannel({
      anchor: "center",
      icao: "TEST",
      lat: 42.3656,
      lon: -71.0096,
      distNm: 30,
    }),
    {
      channel: "traffic:center:42.4:-71:30",
      params: {},
    },
  );
  assert.deepEqual(
    buildAircraftTrafficChannel({
      anchor: "airport",
      icao: "kbos",
      lat: 42.3656,
      lon: -71.0096,
      distNm: 30,
    }),
    {
      channel: "traffic:airport:KBOS:42.4:-71:30",
      params: {},
    },
  );
}

{
  assert.equal(normalizeRealtimeChannel("callsign:ual964"), "callsign:UAL964");
  assert.equal(normalizeRealtimeChannel(" aircraft:a1b2c3 "), "aircraft:A1B2C3");
}

{
  assert.deepEqual(buildRouteChannel(" aal123 ", { icao: "kbos" }), {
    channel: "route:AAL123:airport:KBOS",
    params: {},
  });
  assert.deepEqual(
    buildRouteChannel(" aal123 ", { lat: 42.3656, lon: -71.0096 }),
    {
      channel: "route:AAL123:center:42.4:-71",
      params: {},
    },
  );
  assert.equal(
    normalizeRealtimeChannel(" route:aal123:center:42.3656:-71.0096 "),
    "route:AAL123:center:42.4:-71",
  );
  assert.equal(
    normalizeRealtimeChannel("route:aal123:center:42.3656:-71.0096:extra"),
    "",
  );
  assert.equal(normalizeRealtimeChannel("route:aal123:airport:kbos:extra"), "");
  assert.equal(
    normalizeRealtimeChannel("traffic:center:42.3656:-71.0096:40:extra"),
    "",
  );
  assert.equal(
    normalizeRealtimeChannel("traffic:airport:kbos:42.3656:-71.0096:40:extra"),
    "",
  );
}

console.log("realtimeChannels.test.ts ok");
