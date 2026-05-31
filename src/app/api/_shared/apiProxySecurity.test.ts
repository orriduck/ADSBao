import assert from "node:assert/strict";

import {
  __resetProxySecurityForTests,
  buildProxyHeaders,
  checkProxyRateLimit,
  createCorsPreflightResponse,
  enforceProxyRequest,
  logProxyRouteResponse,
  normalizeAircraftHex,
  normalizeDistanceNm,
  normalizeLatitude,
  normalizeLongitude,
  readResponseJson,
  readResponseText,
} from "./apiProxySecurity";

__resetProxySecurityForTests();

assert.equal(normalizeLatitude("42.1"), 42.1);
assert.equal(normalizeLatitude("91"), null);
assert.equal(normalizeLongitude("-71"), -71);
assert.equal(normalizeLongitude("-181"), null);
assert.equal(normalizeDistanceNm("30"), 30);
assert.equal(normalizeDistanceNm("251"), null);
assert.equal(normalizeAircraftHex("a7bbe9"), "A7BBE9");
assert.equal(normalizeAircraftHex("~abcd12"), "~ABCD12");
assert.equal(normalizeAircraftHex("JBU1443"), "");

const sameOriginRequest = new Request("https://adsbao.test/api/proxy/metar/KBOS", {
  headers: {
    origin: "https://adsbao.test",
    "x-forwarded-for": "203.0.113.1",
  },
});

assert.equal(
  buildProxyHeaders(sameOriginRequest).get("Access-Control-Allow-Origin"),
  "https://adsbao.test",
);

assert.equal(buildProxyHeaders(sameOriginRequest).get("Vary"), "Origin");

assert.equal(
  buildProxyHeaders(sameOriginRequest, {}, { varyOrigin: false }).get("Vary"),
  null,
);

assert.equal(
  buildProxyHeaders(
    sameOriginRequest,
    {},
    { varyOrigin: false },
  ).get("Access-Control-Allow-Origin"),
  "https://adsbao.test",
);

assert.equal(createCorsPreflightResponse(sameOriginRequest).status, 204);

const blockedOriginRequest = new Request(
  "https://adsbao.test/api/proxy/metar/KBOS",
  {
    headers: {
      origin: "https://evil.example",
      "x-forwarded-for": "203.0.113.2",
    },
  },
);

assert.equal(createCorsPreflightResponse(blockedOriginRequest).status, 403);
assert.equal(enforceProxyRequest(blockedOriginRequest)?.status, 403);

const limitedRequest = new Request("https://adsbao.test/api/proxy/metar/KBOS", {
  headers: { "x-forwarded-for": "203.0.113.3" },
});

assert.equal(
  checkProxyRateLimit({
    request: limitedRequest,
    key: "test",
    now: 1_000,
    windowMs: 60_000,
    maxRequests: 1,
  }).allowed,
  true,
);
assert.equal(
  checkProxyRateLimit({
    request: limitedRequest,
    key: "test",
    now: 2_000,
    windowMs: 60_000,
    maxRequests: 1,
  }).allowed,
  false,
);

await assert.rejects(
  readResponseText(new Response("abcdef"), {
    label: "test body",
    maxBytes: 5,
  }),
  /test body exceeded 5 bytes/,
);

assert.deepEqual(
  await readResponseJson(new Response(JSON.stringify({ ok: true })), {
    label: "json body",
    maxBytes: 64,
  }),
  { ok: true },
);

{
  const logs = [];
  const response = new Response("{}", {
    status: 200,
    headers: {
      "x-data-source": "adsb.lol",
      "x-provider-attempts": "adsb.lol:200",
    },
  });
  assert.equal(
    logProxyRouteResponse({
      request: new Request("https://adsbao.test/api/proxy/aircraft/positions/1/2/3", {
        headers: { "x-vercel-id": "iad1::abc" },
      }),
      route: "/api/proxy/aircraft/positions",
      response,
      startMs: 10,
      nowMs: 38,
      logger: (line) => logs.push(line),
    }),
    response,
  );
  assert.deepEqual(JSON.parse(logs[0]), {
    level: "info",
    msg: "proxy_route_done",
    route: "/api/proxy/aircraft/positions",
    requestId: "iad1::abc",
    status: 200,
    ms: 28,
    source: "adsb.lol",
    attempts: "adsb.lol:200",
  });
}

{
  const logs = [];
  logProxyRouteResponse({
    request: new Request("https://adsbao.test/api/proxy/flight-routes/callsign/DAL977"),
    route: "/api/proxy/flight-routes/callsign",
    response: new Response("{}", {
      status: 200,
      headers: { "x-route-source": "adsbdb" },
    }),
    startMs: 1,
    nowMs: 2,
    logger: (line) => logs.push(line),
  });
  assert.equal(JSON.parse(logs[0]).source, "adsbdb");
}
