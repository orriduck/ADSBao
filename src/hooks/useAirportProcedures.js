"use client";

import { useEffect, useState } from "react";
import { procedureDataClient } from "../features/airport/procedures/procedureDataClient.js";
import { buildRunwayMapFromOurAirports } from "../features/airport/map/ourAirportsRunwayMap.js";

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
        // OurAirports drives the visual runwayMap (centerlines, end labels,
        // thresholds). CIFP only lists runways with published instrument
        // procedures, so it would silently drop VFR-only strips (KBOS 09/27,
        // 14/32, 15L/33R, …). Procedure rendering still consumes its own
        // `runwayProcedures` payload — that one's keyed only by runways
        // that *have* procedures, so it doesn't need to share this shape.
        setRunwayMap(ourAirportsRunwayMap);
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
