"use client";

import { useEffect, useState } from "react";
import { procedureDataClient } from "../services/procedures/procedureDataClient.js";

export function useAirportProcedures(airport, selectedProcedureId = "") {
  const [index, setIndex] = useState(null);
  const [geojson, setGeojson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let disposed = false;
    const normalizedAirport = String(airport || "").trim().toUpperCase();

    const load = async () => {
      if (!normalizedAirport) {
        setIndex(null);
        setGeojson(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const payload =
          await procedureDataClient.fetchLiveProcedures(normalizedAirport);
        if (disposed) return;
        const nextIndex = payload?.index || null;
        setIndex(nextIndex);
        setGeojson(payload?.geojson || null);
      } catch (nextError) {
        if (disposed) return;
        setError(nextError);
        setGeojson(null);
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
    loading,
    error,
  };
}
