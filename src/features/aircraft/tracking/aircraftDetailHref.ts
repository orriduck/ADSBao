import { normalizeCallsign } from "@/utils/callsign";

export function buildAircraftDetailHref(callsign: unknown) {
  const normalized = normalizeCallsign(callsign);
  return normalized ? `/aircraft/${normalized}` : "";
}
