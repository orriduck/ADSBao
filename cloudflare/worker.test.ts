import assert from "node:assert/strict";
import {
  buildRuntimeEnvScript,
  handleRequest,
  isProxiedPath,
  type Env,
} from "./worker";

assert.equal(isProxiedPath("/api/airport/KBOS"), true);
assert.equal(isProxiedPath("/events/nearby/callsign/DAL1576"), true);
assert.equal(isProxiedPath("/health"), true);
assert.equal(isProxiedPath("/airport/KBOS"), false);

const runtimeScript = buildRuntimeEnvScript({
  ASSETS: { fetch },
  ADSBAO_BACKEND: { fetch },
  VITE_NEW_RELIC_ACCOUNT_ID: "123",
  VITE_NEW_RELIC_BROWSER_APP_ID: "456",
  VITE_NEW_RELIC_BROWSER_LICENSE_KEY: 'quote"safe',
});
assert.match(runtimeScript, /VITE_NEW_RELIC_ACCOUNT_ID/);
assert.match(runtimeScript, /quote\\"safe/);

let assetRequest: Request | string | URL | null = null;
const env: Env = {
  ASSETS: {
    async fetch(request) {
      assetRequest = request;
      return new Response("asset");
    },
  },
  ADSBAO_BACKEND: {
    async fetch() {
      throw new Error("Unexpected backend request");
    },
  },
};

const assetResponse = await handleRequest(
  new Request("https://preview.example/airport/KBOS"),
  env,
);
assert.equal(await assetResponse.text(), "asset");
assert.ok(assetRequest instanceof Request);

let proxiedRequest: Request | null = null;
const upstreamResponse = new Response("stream", {
  headers: { "Content-Type": "text/event-stream" },
});
const sseRequest = new Request(
  "https://preview.example/events/nearby/callsign/DAL1576?locale=en",
  { headers: { Accept: "text/event-stream" } },
);
const proxiedResponse = await handleRequest(
  sseRequest,
  {
    ...env,
    ADSBAO_BACKEND: {
      async fetch(request) {
        assert.ok(request instanceof Request);
        proxiedRequest = request;
        return upstreamResponse;
      },
    },
  },
);
assert.equal(proxiedRequest, sseRequest);
assert.equal(
  proxiedRequest?.url,
  "https://preview.example/events/nearby/callsign/DAL1576?locale=en",
);
assert.equal(proxiedRequest?.headers.get("accept"), "text/event-stream");
assert.equal(proxiedResponse, upstreamResponse);
assert.equal(await proxiedResponse.text(), "stream");

const unavailableResponse = await handleRequest(
  new Request("https://preview.example/health"),
  env,
);
assert.equal(unavailableResponse.status, 502);
assert.equal(unavailableResponse.headers.get("cache-control"), "no-store");

const retiredResponse = await handleRequest(
  new Request("https://preview.example/ws"),
  env,
);
assert.equal(retiredResponse.status, 404);

console.log("cloudflare/worker.test.ts ok");
