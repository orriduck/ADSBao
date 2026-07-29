import { normalizeCallsign } from "@/utils/callsign";

export const ONBOARD_MODE_QUERY_VALUE = "onboard";

export function isOnboardMode(value: unknown) {
  return String(value || "").trim().toLowerCase() === ONBOARD_MODE_QUERY_VALUE;
}

export function buildOnboardFlightHref(callsign: unknown) {
  const normalized = normalizeCallsign(callsign);
  return normalized
    ? `/aircraft/${encodeURIComponent(normalized)}?mode=${ONBOARD_MODE_QUERY_VALUE}`
    : "/here";
}
