import assert from "node:assert/strict";

import { buildSecurityHeaders } from "./securityHeaders";

const csp = buildSecurityHeaders()[0].headers.find(
  (header) => header.key === "Content-Security-Policy",
)?.value;

assert.ok(csp?.includes("connect-src 'self'"), "same-origin SSE must be allowed");
assert.equal(csp?.includes("ws:"), false, "CSP must not retain WebSocket sources");
assert.equal(csp?.includes("wss:"), false, "CSP must not retain WebSocket sources");

console.log("securityHeaders.test.ts ok");
