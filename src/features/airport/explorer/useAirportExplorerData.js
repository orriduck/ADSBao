"use client";

import { useMemo } from "react";
import { useAircraftPositions } from "@/hooks/useAircraftPositions.js";
import { useFlightRoutes } from "@/hooks/useFlightRoutes.js";
import { useMetar } from "@/hooks/useMetar.js";
import { useFlightAwareEnabled } from "@/features/app-shell/auth/useFlightAwareEnabled.js";
import { enrichAircraftWithRoutes } from "./airportExplorerModel.js";

export function useAirportExplorerData(airportProfile) {
  const flightAwareEnabled = useFlightAwareEnabled();
  const {
    raw: metarRaw,
    parsed: metar,
    loading: metarLoading,
    error: metarError,
  } = useMetar(airportProfile.icao);
  const {
    aircraft,
    initialLoading: aircraftInitialLoading,
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
    routeProvider: flightAwareEnabled ? "flightaware" : "",
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
      metarError,
    },
    traffic: {
      aircraft: aircraftWithRoutes,
      aircraftInitialLoading,
      lastUpdated,
      feedStatus,
      feedSource,
      routeLoadingCount,
      applyTemporaryRoute,
    },
  };
}
