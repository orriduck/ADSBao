import { useCallback, useEffect, useRef, useState } from "react";
import { AIRCRAFT_TRAFFIC_CONFIG } from "@/config/aviation";

export function useTrackedFlightTraceRefreshKey({ lostSignal = false } = {}) {
  const sequenceRef = useRef(0);
  const [refreshKey, setRefreshKey] = useState("");
  const publishRefresh = useCallback((kind: string) => {
    sequenceRef.current += 1;
    setRefreshKey(`${kind}:${sequenceRef.current}`);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const refreshMs = lostSignal
      ? AIRCRAFT_TRAFFIC_CONFIG.lostSignalTraceRefreshMs
      : AIRCRAFT_TRAFFIC_CONFIG.traceSteadyRefreshMs;
    const timer = window.setInterval(
      () => publishRefresh(lostSignal ? "lost-signal" : "steady"),
      refreshMs,
    );
    return () => window.clearInterval(timer);
  }, [lostSignal, publishRefresh]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        publishRefresh("visibility");
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [publishRefresh]);

  return refreshKey;
}
