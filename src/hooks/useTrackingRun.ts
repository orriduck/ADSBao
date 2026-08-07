import { useCallback, useEffect, useMemo, useState } from "react";

type TrackingRun = {
  id: string;
  status: string;
};

type TrackingObservation = {
  aircraft?: Record<string, unknown>;
  receivedAt?: string;
};

async function request(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!response.ok) throw new Error(`Tracking request failed (${response.status})`);
  return response.json();
}

export function useTrackingRun(callsign: string, { requested = false } = {}) {
  const [run, setRun] = useState<TrackingRun | null>(null);
  const [observations, setObservations] = useState<TrackingObservation[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [stopped, setStopped] = useState(false);

  useEffect(() => {
    setStopped(false);
  }, [callsign]);

  const refresh = useCallback(async () => {
    if (!callsign) return;
    const lookup = await request(`/api/tracking-runs?callsign=${encodeURIComponent(callsign)}`);
    let nextRun = lookup?.run || null;
    if (!nextRun && requested && !stopped) {
      const created = await request("/api/tracking-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callsign }),
      });
      nextRun = created?.run || null;
    }
    setRun(nextRun);
    if (!nextRun?.id) {
      setObservations([]);
      return;
    }
    const detail = await request(`/api/tracking-runs/${encodeURIComponent(nextRun.id)}`);
    setRun(detail?.run || nextRun);
    setObservations(Array.isArray(detail?.observations) ? detail.observations : []);
  }, [callsign, requested, stopped]);

  useEffect(() => {
    let disposed = false;
    const load = () => refresh().catch((nextError) => !disposed && setError(nextError));
    setRun(null);
    setObservations([]);
    setError(null);
    load();
    const timer = window.setInterval(load, 10_000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [refresh]);

  const stop = useCallback(async () => {
    if (!run?.id) return;
    const result = await request(`/api/tracking-runs/${encodeURIComponent(run.id)}`, { method: "DELETE" });
    setRun(result?.run || null);
    setStopped(true);
  }, [run?.id]);

  const traceHistory = useMemo(
    () => observations.map(({ aircraft, receivedAt }) => ({
      ...(aircraft || {}),
      timestampMs: Date.parse(String(receivedAt || "")),
    })).filter((point) => Number.isFinite(Number(point.timestampMs))),
    [observations],
  );

  return { run, error, refresh, stop, traceHistory };
}
