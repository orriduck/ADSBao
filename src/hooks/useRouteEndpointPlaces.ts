import { useEffect, useMemo, useState } from "react";
import { lookupAirportCity } from "@/features/aviation/flight-routes/airportCityTable";
import {
  formatRoutePlaceLabel,
  getFlightRouteEndpointIcaos,
} from "@/utils/flightRouteDisplay";

const EMPTY = { origin: "", destination: "" };

// Resolves "🇺🇸 City" place labels for a flight route's two endpoints by
// looking up each airport's served city + country (OurAirports data) from the
// ICAO. Route providers only return airport codes, so this is the served-city
// source of truth (KPHL → "Philadelphia", not the runway's township). The
// table is lazy-loaded once; only the selected aircraft's card triggers it.
//
// Returns empty strings until both ends resolve, so the caller keeps the static
// IATA face and only starts the carousel once real place labels exist.
export function useRouteEndpointPlaces(route) {
  const { origin: originIcao, destination: destinationIcao } = useMemo(
    () => getFlightRouteEndpointIcaos(route),
    [route],
  );
  const [places, setPlaces] = useState(EMPTY);

  useEffect(() => {
    if (!originIcao || !destinationIcao) {
      setPlaces(EMPTY);
      return undefined;
    }
    let cancelled = false;
    Promise.all([
      lookupAirportCity(originIcao),
      lookupAirportCity(destinationIcao),
    ]).then(([originCity, destinationCity]) => {
      if (cancelled) return;
      const origin = formatRoutePlaceLabel(originCity ?? {});
      const destination = formatRoutePlaceLabel(destinationCity ?? {});
      // Only surface places when BOTH ends resolved, so the carousel never
      // shows a half-empty face.
      setPlaces(origin && destination ? { origin, destination } : EMPTY);
    });
    return () => {
      cancelled = true;
    };
  }, [originIcao, destinationIcao]);

  return places;
}
