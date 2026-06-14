import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import { signRealtimeProviderGrant } from "./realtimeAuthToken";

function decodeBase64Url(segment: string) {
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
}

{
  const token = signRealtimeProviderGrant({
    provider: "flightaware",
    secret: "test-secret",
    expiresAt: 1_800,
  });
  const [payloadSegment, signatureSegment] = token.split(".");
  assert.ok(payloadSegment);
  assert.ok(signatureSegment);
  assert.deepEqual(decodeBase64Url(payloadSegment), {
    provider: "flightaware",
    exp: 1_800,
  });

  const expectedSignature = createHmac("sha256", "test-secret")
    .update(payloadSegment)
    .digest("base64url");
  assert.equal(signatureSegment, expectedSignature);
}

assert.throws(
  () =>
    signRealtimeProviderGrant({
      provider: "adsbdb",
      secret: "test-secret",
      expiresAt: 1_800,
    }),
  /Unsupported realtime provider/,
);

assert.throws(
  () =>
    signRealtimeProviderGrant({
      provider: "flightaware",
      secret: "",
      expiresAt: 1_800,
    }),
  /Realtime auth secret is not configured/,
);

console.log("realtimeAuthToken.test.ts ok");
