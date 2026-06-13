import {
  readResponseJson,
  readResponseText,
} from "../../../app/api/_shared/apiProxySecurity";
import { createOpenAipAirportQueriesFromEnv } from "../../airport/openaip/openAipDirectory";
import {
  ADSBDB_USER_AGENT,
  buildAdsbdbCallsignRouteUrl,
  buildAdsbdbRouteResponse,
} from "./adsbdbRouteProxyModel";
import {
  FLIGHTAWARE_USER_AGENT,
  buildFlightAwareCallsignRouteUrl,
  buildFlightAwareRouteResponse,
} from "./flightawareRouteProxyModel";
import { normalizeRouteCallsign } from "./flightRouteCallsign";

// Module-scoped dedupe key — each page load fires the route gate ~50
// times (one per nearby callsign), and logging unconditionally floods
// the server console. Only emit when the resolved signature changes,
// so a wrong-provider symptom still shows up immediately but identical
// repeats stay quiet.
let lastGateLog = "";

type FlightRouteMechanismRecord = Record<string, any>;

async function isFlightAwareRouteProviderEnabled() {
  const [{ currentUser }, featureFlagAccess, featureFlagModel] = await Promise.all([
    import("@clerk/nextjs/server"),
    import("../../app-shell/feature-flags/userFeatureFlags.server"),
    import("../../app-shell/feature-flags/userFeatureFlagsModel"),
  ]);
  const user = await currentUser();
  const email = featureFlagModel.getClerkUserPrimaryEmail(user);
  const enabled = await featureFlagAccess.isFlightAwareEnabledForUser({ user });
  if (process.env.NODE_ENV !== "production") {
    const signature = `${user ? user.id || "no-id" : "no-user"}|${email || "no-email"}|${enabled}`;
    if (signature !== lastGateLog) {
      lastGateLog = signature;
      if (!user) {
        console.info("[flightaware-route] gate: no Clerk user → adsbdb");
      } else if (!email) {
        console.info(
          "[flightaware-route] gate: Clerk user lacks primary email → adsbdb",
        );
      } else {
        console.info(
          `[flightaware-route] gate: clerkUser=${user.id || "no-id"} email=${email} flightAwareEnabled=${enabled} → ${enabled ? "flightaware" : "adsbdb"}`,
        );
      }
    }
  }
  return enabled;
}

async function fetchAdsbdbRoute(callsign: unknown) {
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
  } catch (err: any) {
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

async function fetchFlightAwareRoute(
  callsign: unknown,
  { airportQueries = createOpenAipAirportQueriesFromEnv() }: FlightRouteMechanismRecord = {},
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
  } catch (err: any) {
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
      ? (ident: unknown) => airportQueries.getAirportByIdent(ident)
      : null,
  });
}

// Lookup order:
//   1. If the current Clerk user has flightAwareEnabled, FlightAware is the
//      exclusive provider. We return whatever the scraper gives us (route data
//      or null), no adsbdb/community fallback.
//   2. All other users use adsbdb exclusively.
export const resolveFlightRoute = async ({
  callsign,
  shouldUseFlightAwareRouteProvider = isFlightAwareRouteProviderEnabled,
  fetchFlightAwareRoute: fetchFlightAwareRouteImpl = fetchFlightAwareRoute,
  fetchAdsbdbRoute: fetchAdsbdbRouteImpl = fetchAdsbdbRoute,
}: FlightRouteMechanismRecord = {}) => {
  const normalizedCallsign = normalizeRouteCallsign(callsign);
  if (!normalizedCallsign) return null;

  let flightAwareAllowed = false;
  try {
    flightAwareAllowed = Boolean(
      await shouldUseFlightAwareRouteProvider(normalizedCallsign),
    );
  } catch (err: any) {
    console.warn(
      `[flightaware-route] feature flag check failed for ${normalizedCallsign}:`,
      err.message,
    );
  }

  if (flightAwareAllowed) {
    return fetchFlightAwareRouteImpl(normalizedCallsign);
  }

  return fetchAdsbdbRouteImpl(normalizedCallsign);
};
