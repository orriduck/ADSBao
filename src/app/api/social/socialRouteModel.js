import { createHash } from "node:crypto";

import { getClientIp } from "../_shared/apiProxySecurity.js";
import { normalizeSocialEntityInput } from "../../../features/social/socialModel.js";

const SESSION_HEADER = "x-adsbao-session";
const DEFAULT_SESSION_SALT = "adsbao-social-v1";

export function getSocialSessionSeed(request, rawBody = null) {
  const headerSeed = request.headers.get(SESSION_HEADER);
  if (headerSeed) return headerSeed.trim();
  const bodySeed =
    rawBody && typeof rawBody === "object" ? String(rawBody.sessionId || "") : "";
  if (bodySeed.trim()) return bodySeed.trim();
  return `${getClientIp(request)}|${request.headers.get("user-agent") || ""}`;
}

export function buildSocialSessionHash(seed, {
  env = process.env,
} = {}) {
  const salt =
    env.SOCIAL_SESSION_SALT ||
    env.NEXT_PUBLIC_SITE_URL ||
    env.VERCEL_URL ||
    DEFAULT_SESSION_SALT;
  return createHash("sha256")
    .update(`${salt}:${String(seed || "")}`)
    .digest("hex");
}

export function getSocialSessionHash(request, {
  rawBody = null,
  env = process.env,
} = {}) {
  return buildSocialSessionHash(getSocialSessionSeed(request, rawBody), { env });
}

export function normalizeSocialSummarySearchParams(searchParams) {
  return normalizeSocialEntityInput({
    entityType: searchParams.get("entityType"),
    entityKey: searchParams.get("entityKey"),
    contextAirportIcao: searchParams.get("contextAirportIcao"),
  });
}
