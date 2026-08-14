import assert from "node:assert/strict";

import {
  buildCloudflareHeadersFile,
  buildSecurityHeaders,
} from "./securityHeaders";

const csp = buildSecurityHeaders()[0].headers.find(
  (header) => header.key === "Content-Security-Policy",
)?.value;

assert.ok(csp?.includes("connect-src 'self'"), "same-origin SSE must be allowed");
assert.equal(csp?.includes("ws:"), false, "CSP must not retain WebSocket sources");
assert.equal(csp?.includes("wss:"), false, "CSP must not retain WebSocket sources");

const cloudflareHeaders = buildCloudflareHeadersFile();
assert.match(cloudflareHeaders, /^\/\*/);
assert.match(cloudflareHeaders, /\/assets\/\*[\s\S]*max-age=31536000, immutable/);
assert.match(cloudflareHeaders, /\/adsbao-version\.json[\s\S]*Cache-Control: no-store/);
assert.match(cloudflareHeaders, /\/sw\.js[\s\S]*must-revalidate/);

console.log("securityHeaders.test.ts ok");
