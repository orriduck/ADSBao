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

// Module-scoped dedupe key — each page load fires the route gate ~50
// times (one per nearby callsign), and logging unconditionally floods
// the server console. Only emit when the resolved signature changes,
// so a wrong-provider symptom still shows up immediately but identical
// repeats stay quiet.
let lastGateLog = "";

async function isFlightAwareRouteProviderEnabled() {
  const [{ currentUser }, routeProviderAccess] = await Promise.all([
    import("@clerk/nextjs/server"),
    import("../../app-shell/auth/clerkRouteProviderAccess.js"),
  ]);
  const user = await currentUser();
  const entity = routeProviderAccess.buildClerkUserAccessEntity(user);
  const enabled = routeProviderAccess.isFlightAwareOwnerEntity(entity);
  if (process.env.NODE_ENV !== "production") {
    const signature = `${user ? entity?.id || "no-id" : "no-user"}|${entity?.flightAwareEnabled ?? "?"}|${enabled}`;
    if (signature !== lastGateLog) {
      lastGateLog = signature;
      if (!user) {
        console.info("[flightaware-route] gate: no Clerk user → adsbdb");
      } else if (!entity) {
        console.info(
          "[flightaware-route] gate: Clerk user lacks id → adsbdb",
        );
      } else {
        console.info(
          `[flightaware-route] gate: clerkUser=${entity.id} flightAwareEnabled=${entity.flightAwareEnabled} → ${enabled ? "flightaware" : "adsbdb"}`,
        );
      }
    }
  }
  return enabled;
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
    resolveAirportByIdent: airportQueries?.getAirportByIdent
      ? (ident) => airportQueries.getAirportByIdent(ident)
      : null,
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

// Lookup order:
//   1. Active Supabase community feedback override (always wins so a
//      user-submitted correction can temporarily fix a wrong route
//      inside the 12-hour TTL). Override is keyed by callsign only —
//      submissions made under any airport context apply universally
//      to the same flight number.
//   2. If the current Clerk user has flightAwareEnabled, FlightAware
//      is the EXCLUSIVE provider. We return whatever the scraper gives
//      us (route data or null), no adsbdb fallback. This guarantees
//      that FlightAware-tier users always see FA-sourced metadata —
//      origin / destination / airline are pulled from the live
//      flightaware.com page, not from adsbdb's static dataset.
//   3. All other users → adsbdb.
export const resolveFlightRoute = async ({
  callsign,
  requestedProvider = "",
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

  const provider = String(requestedProvider || "").trim().toLowerCase();
  let flightAwareAllowed = false;
  try {
    flightAwareAllowed = Boolean(
      await shouldUseFlightAwareRouteProvider(normalizedCallsign),
    );
  } catch (err) {
    console.warn(
      `[flightaware-route] Clerk access check failed for ${normalizedCallsign}:`,
      err.message,
    );
  }

  const useFlightAware =
    flightAwareAllowed && (provider === "flightaware" || provider === "");

  if (useFlightAware) {
    return fetchFlightAwareRouteImpl(normalizedCallsign);
  }

  return fetchAdsbdbRouteImpl(normalizedCallsign);
};
