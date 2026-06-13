"use client";

import { useMemo } from "react";
import { useAircraftPositions } from "@/hooks/useAircraftPositions";
import { useFlightRoutes } from "@/hooks/useFlightRoutes";
import { useMetar } from "@/hooks/useMetar";
import { useFlightAwareEnabled } from "@/features/app-shell/auth/useFlightAwareEnabled";
import {
  ROUTE_PROVIDER,
  resolveRouteProvider,
} from "@/features/aviation/sourceDisplayModel";
import { enrichAircraftWithRoutes } from "./airportExplorerModel";

export function useAirportExplorerData(
  airportProfile,
  options: { metarIcao?: string } = {},
) {
  const { enabled: flightAwareEnabled, resolved: flightAwareResolved } = useFlightAwareEnabled();
  const routeProvider = resolveRouteProvider({ flightAwareEnabled });
  // While feature flags are still unresolved, hold the route provider
  // at its pre-resolution state (adsbdb). This prevents the sidebar
  // dep/arr cards from appearing/disappearing in a jarring layout jump
  // when FlightAware flips from unresolved-false to resolved-true.
  // `metarIcao` overrides which station the weather card pulls from
  // when the explorer isn't anchored to a real airport (e.g. the
  // near-me view, which sources its temperature from the closest
  // nearby airport's METAR rather than the page profile's empty
  // ICAO). Defaults to the profile's ICAO.
  const metarLookupIcao = options.metarIcao ?? airportProfile.icao;
  const {
    raw: metarRaw,
    parsed: metar,
    loading: metarLoading,
    settled: metarSettled,
    error: metarError,
    statusCode: metarStatusCode,
  } = useMetar(metarLookupIcao);
  const {
    aircraft,
    initialLoading: aircraftInitialLoading,
    loadingOverlayActive: aircraftLoadingOverlayActive,
    settled: aircraftPositionsSettled,
    lastUpdated,
    feedStatus,
    feedSource,
  } = useAircraftPositions(
    airportProfile.icao,
    airportProfile.lat,
    airportProfile.lon,
  );
  const {
    routesByCallsign,
    loadingCount: routeLoadingCount,
    applyTemporaryRoute,
  } = useFlightRoutes(aircraft, {
    ...airportProfile,
    routeProvider:
      routeProvider === ROUTE_PROVIDER.FLIGHTAWARE ? routeProvider : "",
  });

  const aircraftWithRoutes = useMemo(
    () =>
      enrichAircraftWithRoutes({
        aircraft,
        routesByCallsign,
        airportProfile,
      }),
    [aircraft, routesByCallsign, airportProfile],
  );

  return {
    weather: {
      metar,
      metarRaw,
      metarLoading,
      metarSettled,
      metarError,
      metarStatusCode,
    },
    traffic: {
      aircraft: aircraftWithRoutes,
      aircraftInitialLoading,
      aircraftPositionsSettled,
      lastUpdated,
      feedStatus,
      feedSource,
      routeProvider,
      routeLoadingCount,
      aircraftLoadingOverlayActive,
      applyTemporaryRoute,
      flightAwareResolved,
    },
  };
}
