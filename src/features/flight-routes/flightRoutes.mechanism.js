import { readResponseJson } from "@/services/apiProxySecurity.js";
import { withAuditLogging } from "@/utils/apiLogger.js";
import {
  buildVrsRouteResponse,
  buildVrsRouteUrl,
  shouldUseAerodataboxFallback,
  VRS_ROUTE_USER_AGENT,
} from "@/services/aviation/vrsRouteProxyModel.js";
import {
  AERODATABOX_RAPIDAPI_HOST,
  buildAerodataboxFlightRouteResponse,
  buildAerodataboxFlightUrl,
  reserveAerodataboxRequestSlot,
  resolveAerodataboxDateLocal,
  shouldSuppressVrsRouteAfterAerodataboxStatus,
} from "@/services/aviation/aerodataboxRouteProxyModel.js";

import { sleep } from "./flightRoutes.utils.js";

const aerodataboxRapidApiKey = process.env.AERODATABOX_RAPIDAPI_KEY || "";
const aerodataboxRapidApiHost =
  process.env.AERODATABOX_RAPIDAPI_HOST || AERODATABOX_RAPIDAPI_HOST;
let nextAerodataboxRequestAt = 0;

async function waitForAerodataboxSlot() {
  const slot = reserveAerodataboxRequestSlot({
    now: Date.now(),
    nextAllowedAt: nextAerodataboxRequestAt,
  });
  nextAerodataboxRequestAt = slot.nextAllowedAt;
  if (slot.delayMs > 0) await sleep(slot.delayMs);
}

async function fetchVrsStandingRoute(callsign) {
  let response;
  try {
    response = await fetch(buildVrsRouteUrl(callsign), {
      headers: {
        "User-Agent": VRS_ROUTE_USER_AGENT,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(9_000),
    });
  } catch (err) {
    console.warn(`[vrs-route] fetch failed for ${callsign}:`, err.message);
    return null;
  }

  if (response.status === 404) return null;

  if (!response.ok) {
    console.warn(`[vrs-route] HTTP ${response.status} for ${callsign}`);
    return null;
  }

  const payload = await readResponseJson(response, {
    label: "VRS standing-data route",
    maxBytes: 512 * 1024,
  });
  return buildVrsRouteResponse(callsign, payload);
}

async function fetchAerodataboxRoute(callsign, targetAirport) {
  if (!aerodataboxRapidApiKey) {
    return { route: null, suppressVrsRoute: false };
  }

  const url = buildAerodataboxFlightUrl(callsign, resolveAerodataboxDateLocal());
  const auditedFetch = withAuditLogging(
    (requestUrl, options) => fetch(requestUrl, options),
    { service: "aerodatabox/FlightStatus" },
  );
  let response;
  try {
    await waitForAerodataboxSlot();
    response = await auditedFetch(url, {
      headers: {
        Accept: "application/json",
        "X-RapidAPI-Key": aerodataboxRapidApiKey,
        "X-RapidAPI-Host": aerodataboxRapidApiHost,
      },
      signal: AbortSignal.timeout(9_000),
    });
  } catch (err) {
    console.warn(`[aerodatabox-route] fetch failed for ${callsign}:`, err.message);
    return { route: null, suppressVrsRoute: false };
  }

  if (response.status === 204 || response.status === 404) {
    return { route: null, suppressVrsRoute: false };
  }

  if (!response.ok) {
    console.warn(`[aerodatabox-route] HTTP ${response.status} for ${callsign}`);
    return {
      route: null,
      suppressVrsRoute: shouldSuppressVrsRouteAfterAerodataboxStatus(
        response.status,
      ),
    };
  }

  const payload = await readResponseJson(response, {
    label: "AeroDataBox flight status route",
    maxBytes: 512 * 1024,
  });
  return {
    route: buildAerodataboxFlightRouteResponse(
      callsign,
      payload,
      targetAirport,
    ),
    suppressVrsRoute: false,
  };
}

export const resolveFlightRoute = async ({
  callsign,
  targetAirport,
  forceAerodatabox = false,
} = {}) => {
  if (forceAerodatabox) {
    const aerodataboxResult = await fetchAerodataboxRoute(
      callsign,
      targetAirport,
    );
    return aerodataboxResult.route;
  }

  let route = await fetchVrsStandingRoute(callsign);
  if (shouldUseAerodataboxFallback(route, targetAirport)) {
    const aerodataboxResult = await fetchAerodataboxRoute(
      callsign,
      targetAirport,
    );
    if (aerodataboxResult.route) {
      route = aerodataboxResult.route;
    } else if (aerodataboxResult.suppressVrsRoute) {
      route = null;
    }
  }
  return route;
};
