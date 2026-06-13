import assert from "node:assert/strict";

import { buildSecurityHeaders } from "./securityHeaders";

const csp = buildSecurityHeaders()[0].headers.find(
  (header) => header.key === "Content-Security-Policy",
)?.value;

assert.ok(csp?.includes("ws://localhost:8080"), "local realtime ws must be allowed by connect-src");
assert.ok(
  csp?.includes("wss://*.up.railway.app"),
  "Railway realtime wss endpoint must be allowed by connect-src",
);
assert.ok(
  csp?.includes("wss://*.adsbao.dev"),
  "custom ADSBao realtime wss endpoint must be allowed by connect-src",
);

console.log("securityHeaders.test.ts ok");
