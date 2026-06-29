import assert from "node:assert/strict";
import {
  buildAircraftChannel,
  buildAircraftDetailHref,
  buildAircraftTrafficChannel,
  buildCenterTrafficChannel,
  buildRouteChannel,
  normalizeAircraftHex,
  normalizeRealtimeChannel,
} from "./realtimeChannels";

// normalizeAircraftHex / buildAircraftChannel:hex 兜底通道的键。
{
  assert.equal(normalizeAircraftHex("a1b2c3"), "A1B2C3");
  assert.equal(normalizeAircraftHex(" A1B2C3 "), "A1B2C3");
  assert.equal(normalizeAircraftHex("xyz"), "");
  assert.equal(normalizeAircraftHex("A1B2C"), ""); // 太短
  assert.equal(normalizeAircraftHex(null), "");
  assert.equal(buildAircraftChannel("a1b2c3"), "aircraft:A1B2C3");
  assert.equal(buildAircraftChannel("nope"), "");
}

// buildAircraftDetailHref:合法 hex 带 ?icao= 提示,缺失/非法退回纯路径。
{
  assert.equal(
    buildAircraftDetailHref("qtr57h", "a1b2c3"),
    "/aircraft/QTR57H?icao=A1B2C3",
  );
  assert.equal(buildAircraftDetailHref("qtr57h"), "/aircraft/QTR57H");
  assert.equal(buildAircraftDetailHref("qtr57h", "bad-hex"), "/aircraft/QTR57H");
  assert.equal(buildAircraftDetailHref(""), "");
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
      lat: 42.3656,
      lon: -71.0096,
      distNm: 30,
    }),
    {
      channel: "traffic:center:42.4:-71:30",
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
    buildRouteChannel(" aal123 ", {
      icao: "kbos",
      routeProvider: "flightaware",
    }),
    {
      channel: "route:AAL123:airport:KBOS",
      params: { routeProvider: "flightaware" },
    },
  );
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
  assert.equal(
    normalizeRealtimeChannel("traffic:airport:kbos:42.3656:-71.0096:40"),
    "",
  );
}

console.log("realtimeChannels.test.ts ok");
