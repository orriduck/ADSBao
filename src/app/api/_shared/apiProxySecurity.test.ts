import assert from "node:assert/strict";

import {
  buildProxyHeaders,
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
  enforceProxyRequest(limitedRequest, {
    rateLimit: { key: "test", now: 1_000, windowMs: 60_000, maxRequests: 1 },
  }),
  null,
);
const limitedResponse = enforceProxyRequest(limitedRequest, {
  rateLimit: { key: "test", now: 2_000, windowMs: 60_000, maxRequests: 1 },
});
assert.equal(limitedResponse?.status, 429);
assert.equal(limitedResponse?.headers.get("Retry-After"), "59");

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
    await logProxyRouteResponse({
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
  await logProxyRouteResponse({
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

{
  const ingests = [];
  const response = new Response("{}", {
    status: 503,
    headers: {
      "x-data-source": "adsb.lol",
      "x-provider-attempts": "adsb.lol:503;airplanes.live:429",
    },
  });
  assert.equal(
    await logProxyRouteResponse({
      request: new Request("https://adsbao.test/api/proxy/aircraft/positions/1/2/3", {
        headers: { "x-vercel-id": "iad1::proxy" },
      }),
      route: "/api/proxy/aircraft/positions",
      response,
      startMs: 100,
      nowMs: 345,
      logger: () => {},
      env: {
        NEW_RELIC_LICENSE_KEY: "test-license",
        NEW_RELIC_APP_NAME: "adsbao-test",
        NEW_RELIC_METRICS_ENDPOINT: "https://metric-api.example.test/metric/v1",
        NEW_RELIC_LOGS_ENDPOINT: "https://log-api.example.test/log/v1",
        VERCEL_ENV: "preview",
      },
      fetcher: async (url, init) => {
        ingests.push({
          url: String(url),
          apiKey: init?.headers?.["Api-Key"],
          body: JSON.parse(String(init?.body || "null")),
        });
        return new Response(null, { status: 202 });
      },
    }),
    response,
  );

  assert.equal(ingests.length, 2);
  const metricIngest = ingests.find((ingest) => ingest.url.includes("metric"));
  const logIngest = ingests.find((ingest) => ingest.url.includes("log"));
  assert.equal(metricIngest.apiKey, "test-license");
  assert.equal(logIngest.apiKey, "test-license");

  const metricPayload = metricIngest.body[0];
  assert.equal(metricPayload.common.attributes["app.name"], "adsbao-test");
  assert.equal(metricPayload.common.attributes["service.name"], "adsbao-web");
  assert.deepEqual(
    metricPayload.metrics.map((metric) => metric.name),
    ["adsbao.vercel.proxy.requests", "adsbao.vercel.proxy.duration.seconds"],
  );
  assert.equal(metricPayload.metrics[0].attributes.route, "/api/proxy/aircraft/positions");
  assert.equal(metricPayload.metrics[0].attributes.source, "adsb.lol");
  assert.equal(metricPayload.metrics[0].attributes.status, "503");
  assert.equal(metricPayload.metrics[0].attributes["status.class"], "5xx");
  assert.equal(metricPayload.metrics[0].attributes.result, "error");
  assert.equal(metricPayload.metrics[1].value.sum, 0.245);

  const logPayload = logIngest.body[0];
  assert.equal(logPayload.common.attributes["service.name"], "adsbao-web");
  assert.equal(
    logPayload.logs[0].message,
    "proxy_route route=/api/proxy/aircraft/positions source=adsb.lol result=error status=503 status_class=5xx duration_ms=245 attempts=adsb.lol:503;airplanes.live:429",
  );
  assert.equal(logPayload.logs[0].level, "error");
  assert.equal(logPayload.logs[0].attributes.route, "/api/proxy/aircraft/positions");
  assert.equal(logPayload.logs[0].attributes["request.id"], "iad1::proxy");
  assert.equal(logPayload.logs[0].attributes["duration.ms"], 245);
  assert.equal(logPayload.logs[0].attributes.duration_ms, 245);
  assert.equal(logPayload.logs[0].attributes.status_class, "5xx");
}
