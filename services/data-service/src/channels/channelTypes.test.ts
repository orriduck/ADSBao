import assert from "node:assert/strict";
import {
  buildChannelPollingTarget,
  normalizeChannelName,
} from "./channelTypes";

{
  const channel = normalizeChannelName(" airport:kbos ");
  assert.equal(channel.ok, true);
  assert.equal(channel.channel, "airport:KBOS");
  assert.equal(channel.type, "airport");
}

{
  const channel = normalizeChannelName("callsign:aal123");
  assert.equal(channel.ok, true);
  assert.equal(channel.channel, "callsign:AAL123");
  assert.equal(channel.type, "callsign");
}

{
  const channel = normalizeChannelName("route:aal123");
  assert.equal(channel.ok, true);
  assert.equal(channel.channel, "route:AAL123");
  assert.equal(channel.type, "route");
  assert.deepEqual(buildChannelPollingTarget(channel.channel), {
    kind: "route",
    callsign: "AAL123",
  });
}

{
  const channel = normalizeChannelName("viewport:42.365:-71.009:40");
  assert.equal(channel.ok, true);
  assert.equal(channel.channel, "viewport:42.4:-71:40");
  assert.equal(channel.type, "viewport");
  const target = buildChannelPollingTarget(channel.channel, {
    lat: 42.365,
    lon: -71.009,
    distNm: 40,
  });
  assert.deepEqual(target, {
    kind: "positions",
    lat: 42.4,
    lon: -71,
    distNm: 40,
  });
}

{
  const channel = normalizeChannelName("bbox:42.1,-71.2,42.7,-70.5");
  assert.equal(channel.ok, true);
  assert.equal(channel.type, "bbox");
  assert.equal(channel.channel, "bbox:42,-71.25,42.75,-70.5");
  const target = buildChannelPollingTarget(channel.channel);
  assert.equal(target.kind, "positions");
  assert.equal(target.lat, 42.375);
  assert.equal(target.lon, -70.875);
  assert.equal(target.distNm > 0, true);
}

{
  const channel = normalizeChannelName("bbox:-80,-170,80,170");
  assert.equal(channel.ok, false);
  assert.match(channel.error, /too large/i);
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
