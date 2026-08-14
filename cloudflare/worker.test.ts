import assert from "node:assert/strict";
import {
  buildRuntimeEnvScript,
  buildServiceUrl,
  handleRequest,
  isProxiedPath,
  type Env,
} from "./worker";

assert.equal(isProxiedPath("/api/airport/KBOS"), true);
assert.equal(isProxiedPath("/events/nearby/callsign/DAL1576"), true);
assert.equal(isProxiedPath("/health"), true);
assert.equal(isProxiedPath("/airport/KBOS"), false);

assert.equal(
  buildServiceUrl(
    "https://preview.example/api/airport/KBOS?units=us",
    "https://railway.example/private/path",
  ).toString(),
  "https://railway.example/api/airport/KBOS?units=us",
);
assert.throws(() =>
  buildServiceUrl("https://preview.example/health", "file:///tmp/service"),
);
assert.throws(() =>
  buildServiceUrl("https://preview.example/health", "https://user:pass@example.com"),
);

const runtimeScript = buildRuntimeEnvScript({
  ASSETS: { fetch },
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
};

const assetResponse = await handleRequest(
  new Request("https://preview.example/airport/KBOS"),
  env,
);
assert.equal(await assetResponse.text(), "asset");
assert.ok(assetRequest instanceof Request);

const missingOriginResponse = await handleRequest(
  new Request("https://preview.example/health"),
  env,
);
assert.equal(missingOriginResponse.status, 503);
assert.equal(missingOriginResponse.headers.get("cache-control"), "no-store");

let proxiedUrl = "";
let proxiedHeaders: Headers | null = null;
const proxiedResponse = await handleRequest(
  new Request("https://preview.example/health"),
  { ...env, ADSBAO_SERVICE_ORIGIN: "https://railway.example" },
  async (input, init) => {
    proxiedUrl = String(input);
    proxiedHeaders = new Headers(init?.headers);
    return new Response("stream", {
      headers: { "Content-Type": "text/event-stream" },
    });
  },
);
assert.equal(proxiedUrl, "https://railway.example/health");
assert.equal(proxiedHeaders?.get("x-forwarded-host"), "preview.example");
assert.equal(await proxiedResponse.text(), "stream");

const retiredResponse = await handleRequest(
  new Request("https://preview.example/ws"),
  env,
);
assert.equal(retiredResponse.status, 404);

console.log("cloudflare/worker.test.ts ok");
