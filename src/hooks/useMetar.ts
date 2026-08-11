import { useEffect, useRef, useState } from "react";
import { createMetarClient } from "../features/weather/metar/metarClient";
import { normalizeMetarPayload } from "../features/weather/metar/metarModel";
import { shouldResetNearMeRefreshContent } from "../features/airport/nearby/nearMeRefreshModel";
import {
  readErrorStatus,
  readResponseStatus,
} from "../features/aviation/httpClient";

const metarClient = createMetarClient();

export function useMetar(icao, { retainPreviousOnRefresh = false } = {}) {
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [settled, setSettled] = useState(false);
  const [error, setError] = useState(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const hasSettledContentRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const fetchMetar = async () => {
      if (!icao) {
        setRaw("");
        setParsed(null);
        setLoading(false);
        setSettled(false);
        hasSettledContentRef.current = false;
        setError(null);
        setStatusCode(null);
        return;
      }
      setLoading(true);
      if (
        shouldResetNearMeRefreshContent({
          preservePrevious: retainPreviousOnRefresh,
          hasSettledContent: hasSettledContentRef.current,
        })
      ) {
        setSettled(false);
      }
      setError(null);
      setStatusCode(null);
      try {
        const json = await metarClient.fetchMetar(icao);
        if (cancelled) return;
        const normalized = normalizeMetarPayload(json);
        setRaw(normalized.raw);
        setParsed(normalized.parsed);
        setStatusCode(readResponseStatus(json) ?? 200);
      } catch (e) {
        if (!cancelled) {
          console.warn("METAR fetch failed:", e.message);
          setError(e.message);
          setStatusCode(readErrorStatus(e));
        }
      } finally {
        if (!cancelled) {
          hasSettledContentRef.current = true;
          setSettled(true);
          setLoading(false);
        }
      }
    };

    fetchMetar();
    return () => {
      cancelled = true;
    };
  }, [icao, retainPreviousOnRefresh]);

  return { raw, parsed, loading, settled, error, statusCode };
}
