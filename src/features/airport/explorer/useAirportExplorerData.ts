import { useMemo } from "react";
import { useAircraftPositions } from "@/hooks/useAircraftPositions";
import { useFlightRoutes } from "@/hooks/useFlightRoutes";
import { useMetar } from "@/hooks/useMetar";
import { getAircraftIdentity } from "@/features/airport/context/airportContextUiModel";
import { normalizeCallsign } from "@/utils/callsign";
import { enrichAircraftWithRoutes } from "./airportExplorerModel";

export function useAirportExplorerData(
  airportProfile,
  options: {
    metarIcao?: string;
    selectedAircraftId?: string;
    retainPreviousOnRefresh?: boolean;
  } = {},
) {
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
  } = useMetar(metarLookupIcao, {
    retainPreviousOnRefresh: options.retainPreviousOnRefresh,
  });
  const {
    aircraft,
    initialLoading: aircraftInitialLoading,
    loadingOverlayActive: aircraftLoadingOverlayActive,
    settled: aircraftPositionsSettled,
    lastUpdated,
    feedStatus,
    feedSource,
    realtimeStatus,
  } = useAircraftPositions(
    airportProfile.icao,
    airportProfile.lat,
    airportProfile.lon,
    { retainPreviousOnChannelChange: options.retainPreviousOnRefresh },
  );
  // A route lookup is intentional work for the aircraft the user selected;
  // the nearby-traffic list itself must never fan out into route subscriptions.
  const selectedRouteAircraft = useMemo(() => {
    if (!options.selectedAircraftId) return [];
    const selected = aircraft.find(
      (item) => getAircraftIdentity(item) === options.selectedAircraftId,
    );
    return selected && normalizeCallsign(selected.callsign) ? [selected] : [];
  }, [aircraft, options.selectedAircraftId]);
  const {
    routesByCallsign,
    routeStatusByCallsign,
    loadingCount: routeLoadingCount,
  } = useFlightRoutes(selectedRouteAircraft, {
    ...airportProfile,
    enabled: selectedRouteAircraft.length > 0,
  });

  const aircraftWithRoutes = useMemo(
    () =>
      enrichAircraftWithRoutes({
        aircraft,
        routesByCallsign,
        airportProfile,
      }).map((item) => {
        const callsign = normalizeCallsign(item.callsign);
        return {
          ...item,
          flightRouteLookupStatus: callsign ? routeStatusByCallsign[callsign] : undefined,
        };
      }),
    [aircraft, routesByCallsign, routeStatusByCallsign, airportProfile],
  );

  return {
    weather: {
      metar,
      metarRaw,
      metarLoading,
      metarSettled,
    },
    traffic: {
      aircraft: aircraftWithRoutes,
      aircraftInitialLoading,
      aircraftPositionsSettled,
      lastUpdated,
      feedStatus,
      feedSource,
      realtimeStatus,
      routeLoadingCount,
      aircraftLoadingOverlayActive,
    },
  };
}
