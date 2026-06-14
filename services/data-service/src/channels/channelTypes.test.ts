import assert from "node:assert/strict";
import {
  buildChannelPollingTarget,
  normalizeChannelName,
} from "./channelTypes";

{
  const channel = normalizeChannelName(" traffic:center:42.365:-71.009:37.8 ");
  assert.equal(channel.ok, true);
  assert.equal(channel.channel, "traffic:center:42.4:-71:38");
  assert.equal(channel.type, "traffic");
  assert.deepEqual(buildChannelPollingTarget(channel.channel), {
    kind: "positions",
    lat: 42.4,
    lon: -71,
    distNm: 38,
  });
}

{
  const channel = normalizeChannelName("callsign:aal123");
  assert.equal(channel.ok, true);
  assert.equal(channel.channel, "callsign:AAL123");
  assert.equal(channel.type, "callsign");
}

{
  const channel = normalizeChannelName("route:aal123:airport:kbos");
  assert.equal(channel.ok, true);
  assert.equal(channel.channel, "route:AAL123:airport:KBOS");
  assert.equal(channel.type, "route");
  assert.deepEqual(buildChannelPollingTarget(channel.channel), {
    kind: "route",
    callsign: "AAL123",
    context: { type: "airport", icao: "KBOS" },
  });
  assert.deepEqual(
    buildChannelPollingTarget(channel.channel, { routeProvider: "flightaware" }),
    {
      kind: "route",
      callsign: "AAL123",
      context: { type: "airport", icao: "KBOS" },
      provider: "flightaware",
    },
  );
}

{
  const channel = normalizeChannelName("route:aal123:center:42.365:-71.009");
  assert.equal(channel.ok, true);
  assert.equal(channel.channel, "route:AAL123:center:42.4:-71");
  assert.equal(channel.type, "route");
  assert.deepEqual(buildChannelPollingTarget(channel.channel), {
    kind: "route",
    callsign: "AAL123",
    context: { type: "center", lat: 42.4, lon: -71 },
  });
}

{
  const channel = normalizeChannelName("traffic:center:42.365:-71.009:40");
  assert.equal(channel.ok, true);
  assert.equal(channel.channel, "traffic:center:42.4:-71:40");
  assert.equal(channel.type, "traffic");
  const target = buildChannelPollingTarget(channel.channel);
  assert.deepEqual(target, {
    kind: "positions",
    lat: 42.4,
    lon: -71,
    distNm: 40,
  });
}

{
  const channel = normalizeChannelName("traffic:center:42.365:-71.009:900");
  assert.equal(channel.ok, true);
  assert.equal(channel.channel, "traffic:center:42.4:-71:250");
}

{
  assert.equal(
    normalizeChannelName("traffic:center:42.365:-71.009:40:extra").ok,
    false,
  );
  assert.equal(
    normalizeChannelName("traffic:airport:kbos:42.365:-71.009:40:extra").ok,
    false,
  );
  assert.equal(
    normalizeChannelName("traffic:airport:kbos:42.365:-71.009:40").ok,
    false,
  );
  assert.equal(
    normalizeChannelName("route:aal123:center:42.365:-71.009:extra").ok,
    false,
  );
  assert.equal(
    normalizeChannelName("route:aal123:airport:kbos:extra").ok,
    false,
  );
}

{
  const channel = normalizeChannelName("airport:KBOS");
  assert.equal(channel.ok, false);
  assert.match(channel.error, /unsupported/i);
}

{
  const channel = normalizeChannelName("camera:session-abc");
  assert.equal(channel.ok, true);
  assert.equal(channel.channel, "camera:session-abc");
  assert.equal(channel.type, "camera");
  assert.throws(
    () => buildChannelPollingTarget(channel.channel),
    /does not have an active polling target/i,
  );
}

console.log("channelTypes.test.ts ok");
