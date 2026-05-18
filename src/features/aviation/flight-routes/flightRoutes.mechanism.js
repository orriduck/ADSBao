import { readResponseJson } from "../../../app/api/_shared/apiProxySecurity.js";
import { createRouteFeedbackReportsRepositoryFromEnv } from "../../../app/api/dao/routeFeedbackReports.dao.js";
import {
  ADSBDB_USER_AGENT,
  buildAdsbdbCallsignRouteUrl,
  buildAdsbdbRouteResponse,
} from "./adsbdbRouteProxyModel.js";
import { normalizeRouteCallsign } from "./flightRouteCallsign.js";

async function fetchAdsbdbRoute(callsign) {
  const url = buildAdsbdbCallsignRouteUrl(callsign);
  if (!url) return null;

  let response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": ADSBDB_USER_AGENT,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(9_000),
    });
  } catch (err) {
    console.warn(`[adsbdb-route] fetch failed for ${callsign}:`, err.message);
    return null;
  }

  if (response.status === 404) return null;
  if (!response.ok) {
    console.warn(`[adsbdb-route] HTTP ${response.status} for ${callsign}`);
    return null;
  }

  const payload = await readResponseJson(response, {
    label: "adsbdb callsign route",
    maxBytes: 512 * 1024,
  });
  return buildAdsbdbRouteResponse(callsign, payload);
}

async function readCommunityFeedbackOverride({
  feedbackRepository,
  normalizedCallsign,
}) {
  if (!feedbackRepository) return null;
  try {
    const row = await feedbackRepository.readActiveOverride({
      normalizedCallsign,
    });
    return row?.route_payload || null;
  } catch (err) {
    console.warn(
      `[route-feedback] override read failed for ${normalizedCallsign}:`,
      err.message,
    );
    return null;
  }
}

// Lookup order: active Supabase community feedback override -> adsbdb ->
// null. Community feedback intentionally wins so a user-submitted correction
// can temporarily fix a wrong adsbdb route inside the 12-hour TTL. The
// override read is keyed by callsign only — submissions made under any
// airport context apply universally to the same flight number.
export const resolveFlightRoute = async ({
  callsign,
  feedbackRepository = createRouteFeedbackReportsRepositoryFromEnv(),
} = {}) => {
  const normalizedCallsign = normalizeRouteCallsign(callsign);
  if (!normalizedCallsign) return null;

  const override = await readCommunityFeedbackOverride({
    feedbackRepository,
    normalizedCallsign,
  });
  if (override) return override;

  return fetchAdsbdbRoute(normalizedCallsign);
};
