import assert from "node:assert/strict";

import {
  __resetProxySecurityForTests,
  buildProxyHeaders,
  checkProxyRateLimit,
  createCorsPreflightResponse,
  enforceProxyRequest,
  normalizeDistanceNm,
  normalizeLatitude,
  normalizeLongitude,
  readResponseJson,
  readResponseText,
} from "./apiProxySecurity.js";

__resetProxySecurityForTests();

assert.equal(normalizeLatitude("42.1"), 42.1);
assert.equal(normalizeLatitude("91"), null);
assert.equal(normalizeLongitude("-71"), -71);
assert.equal(normalizeLongitude("-181"), null);
assert.equal(normalizeDistanceNm("30"), 30);
assert.equal(normalizeDistanceNm("251"), null);

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
