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

export function useAirportExplorerData(airportProfile) {
  const flightAwareEnabled = useFlightAwareEnabled();
  const routeProvider = resolveRouteProvider({ flightAwareEnabled });
  const {
    raw: metarRaw,
    parsed: metar,
    loading: metarLoading,
    settled: metarSettled,
    error: metarError,
  } = useMetar(airportProfile.icao);
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
    },
  };
}
