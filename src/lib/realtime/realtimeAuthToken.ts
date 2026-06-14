import { createHmac } from "node:crypto";

const SUPPORTED_REALTIME_PROVIDERS = new Set(["flightaware"]);

export function signRealtimeProviderGrant({
  provider,
  secret,
  expiresAt,
}: {
  provider: unknown;
  secret: unknown;
  expiresAt: unknown;
}) {
  const normalizedProvider = String(provider || "").trim().toLowerCase();
  const normalizedSecret = String(secret || "").trim();
  const exp = Number(expiresAt);
  if (!SUPPORTED_REALTIME_PROVIDERS.has(normalizedProvider)) {
    throw new Error("Unsupported realtime provider");
  }
  if (!normalizedSecret) {
    throw new Error("Realtime auth secret is not configured");
  }
  if (!Number.isFinite(exp) || exp <= 0) {
    throw new Error("Realtime auth expiry is invalid");
  }

  const payloadSegment = Buffer.from(
    JSON.stringify({
      provider: normalizedProvider,
      exp: Math.floor(exp),
    }),
  ).toString("base64url");
  const signatureSegment = createHmac("sha256", normalizedSecret)
    .update(payloadSegment)
    .digest("base64url");
  return `${payloadSegment}.${signatureSegment}`;
}
