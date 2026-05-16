"use client";

import { useEffect, useState } from "react";
import { procedureDataClient } from "../features/procedures/procedureDataClient.js";
import { buildRunwayMapFromOurAirports } from "../features/airport-map/ourAirportsRunwayMap.js";

const fetchOurAirportsRunwayMap = async (icao) => {
  try {
    const response = await fetch(`/api/airport/${encodeURIComponent(icao)}`);
    if (!response.ok) return null;
    const payload = await response.json();
    return buildRunwayMapFromOurAirports(icao, payload?.runways);
  } catch {
    return null;
  }
};

export function useAirportProcedures(airport, selectedProcedureId = "") {
  const [index, setIndex] = useState(null);
  const [geojson, setGeojson] = useState(null);
  const [runwayMap, setRunwayMap] = useState(null);
  const [runwayProcedures, setRunwayProcedures] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let disposed = false;
    const normalizedAirport = String(airport || "").trim().toUpperCase();

    const load = async () => {
      if (!normalizedAirport) {
        setIndex(null);
        setGeojson(null);
        setRunwayMap(null);
        setRunwayProcedures(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const [payload, runwayProcedurePayload, ourAirportsRunwayMap] =
          await Promise.all([
            procedureDataClient.fetchLiveProcedures(normalizedAirport),
            procedureDataClient.fetchRunwayProcedures(normalizedAirport),
            fetchOurAirportsRunwayMap(normalizedAirport),
          ]);
        if (disposed) return;
        const nextIndex = payload?.index || null;
        setIndex(nextIndex);
        setGeojson(payload?.geojson || null);
        // FAA CIFP only covers US airports. For everywhere else, fall back to
        // the OurAirports-derived runway map so non-US airports still get the
        // map overlay (thresholds, centerlines, end labels).
        const cifpRunwayMap = payload?.runwayMap;
        const hasCifpRunways = cifpRunwayMap?.runways?.length > 0;
        setRunwayMap(hasCifpRunways ? cifpRunwayMap : ourAirportsRunwayMap);
        setRunwayProcedures(runwayProcedurePayload || null);
      } catch (nextError) {
        if (disposed) return;
        setError(nextError);
        setGeojson(null);
        setRunwayMap(null);
        setRunwayProcedures(null);
      } finally {
        if (!disposed) setLoading(false);
      }
    };

    load();

    return () => {
      disposed = true;
    };
  }, [airport, selectedProcedureId]);

  const selectedProcedure =
    index?.approaches?.find(
      (procedure) => procedure.id === selectedProcedureId,
    ) || index?.approaches?.[0] || null;

  return {
    index,
    selectedProcedure,
    geojson,
    runwayMap,
    runwayProcedures,
    loading,
    error,
  };
}
