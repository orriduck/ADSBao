import {
  readResponseJson,
  readResponseText,
} from "../../../app/api/_shared/apiProxySecurity.js";
import { createOurAirportsQueriesFromEnv } from "../../../app/api/dao/airportDirectory.dao.js";
import { createRouteFeedbackReportsRepositoryFromEnv } from "../../../app/api/dao/routeFeedbackReports.dao.js";
import {
  ADSBDB_USER_AGENT,
  buildAdsbdbCallsignRouteUrl,
  buildAdsbdbRouteResponse,
} from "./adsbdbRouteProxyModel.js";
import {
  FLIGHTAWARE_USER_AGENT,
  buildFlightAwareCallsignRouteUrl,
  buildFlightAwareRouteResponse,
} from "./flightawareRouteProxyModel.js";
import { normalizeRouteCallsign } from "./flightRouteCallsign.js";

async function isFlightAwareRouteProviderEnabled() {
  const [{ currentUser }, routeProviderAccess] = await Promise.all([
    import("@clerk/nextjs/server"),
    import("../../app-shell/auth/clerkRouteProviderAccess.js"),
  ]);
  const user = await currentUser();
  return routeProviderAccess.isFlightAwareOwnerEntity(
    routeProviderAccess.buildClerkUserAccessEntity(user),
  );
}

export async function fetchAdsbdbRoute(callsign) {
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

export async function fetchFlightAwareRoute(
  callsign,
  { airportQueries = createOurAirportsQueriesFromEnv() } = {},
) {
  if (!airportQueries?.getAirportByIdent) return null;
  const url = buildFlightAwareCallsignRouteUrl(callsign);
  if (!url) return null;

  let response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": FLIGHTAWARE_USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(9_000),
    });
  } catch (err) {
    console.warn(`[flightaware-route] fetch failed for ${callsign}:`, err.message);
    return null;
  }

  if (response.status === 404) return null;
  if (!response.ok) {
    console.warn(`[flightaware-route] HTTP ${response.status} for ${callsign}`);
    return null;
  }

  const html = await readResponseText(response, {
    label: "flightaware callsign route",
    maxBytes: 2 * 1024 * 1024,
  });

  return buildFlightAwareRouteResponse({
    callsign,
    html,
    resolveAirportByIdent: (ident) => airportQueries.getAirportByIdent(ident),
  });
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

// Lookup order: active Supabase community feedback override -> FlightAware
// for the owner Clerk account -> adsbdb -> null. Community feedback
// intentionally wins so a user-submitted correction can temporarily fix a
// wrong route inside the 12-hour TTL. The override read is keyed by callsign
// only — submissions made under any airport context apply universally to the
// same flight number.
export const resolveFlightRoute = async ({
  callsign,
  feedbackRepository = createRouteFeedbackReportsRepositoryFromEnv(),
  shouldUseFlightAwareRouteProvider = isFlightAwareRouteProviderEnabled,
  fetchFlightAwareRoute: fetchFlightAwareRouteImpl = fetchFlightAwareRoute,
  fetchAdsbdbRoute: fetchAdsbdbRouteImpl = fetchAdsbdbRoute,
} = {}) => {
  const normalizedCallsign = normalizeRouteCallsign(callsign);
  if (!normalizedCallsign) return null;

  const override = await readCommunityFeedbackOverride({
    feedbackRepository,
    normalizedCallsign,
  });
  if (override) return override;

  let useFlightAware = false;
  try {
    useFlightAware = Boolean(
      await shouldUseFlightAwareRouteProvider(normalizedCallsign),
    );
  } catch (err) {
    console.warn(
      `[flightaware-route] Clerk access check failed for ${normalizedCallsign}:`,
      err.message,
    );
  }

  if (useFlightAware) {
    const flightAwareRoute = await fetchFlightAwareRouteImpl(normalizedCallsign);
    if (flightAwareRoute) return flightAwareRoute;
  }

  return fetchAdsbdbRouteImpl(normalizedCallsign);
};
