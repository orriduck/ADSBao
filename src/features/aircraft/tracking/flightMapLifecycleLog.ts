// Structured, deduped diagnostic log for the flight map lifecycle. Kept on
// purpose (long-lived) so navigation / loading issues can be inspected from the
// browser console via the `[flightmap]` tag, in the same spirit as the existing
// `[aircraft-trace:fetch]` and `[flightaware-enabled]` diagnostics. It only logs
// when the meaningful state changes, so it never floods the console on position
// ticks.

type FlightMapLifecycleSnapshot = {
  callsign?: string;
  lifecycle?: string;
  focalLat?: number | null;
  focalLon?: number | null;
  settled?: boolean;
  lostSignal?: boolean;
  trackingStatus?: string;
};

let lastSignature = "";

export function logFlightMapLifecycle(snapshot: FlightMapLifecycleSnapshot) {
  if (typeof console === "undefined") return;
  // Coarse signature: focal *presence* (not exact coords) + the discrete states,
  // so a moving aircraft doesn't spam a log line every tick.
  const signature = [
    snapshot.callsign || "",
    snapshot.lifecycle || "",
    snapshot.focalLat == null || snapshot.focalLon == null ? "nofocal" : "focal",
    snapshot.settled ? "settled" : "loading",
    snapshot.lostSignal ? "lost" : "live",
    snapshot.trackingStatus || "",
  ].join("|");
  // Stash the latest snapshot for live inspection (e.g. `__flightmapLast` in the
  // console) — handy when diagnosing a navigation/loading edge case.
  try {
    (globalThis as Record<string, unknown>).__flightmapLast = snapshot;
  } catch {
    /* ignore */
  }
  if (signature === lastSignature) return;
  lastSignature = signature;
  console.info("[flightmap]", {
    callsign: snapshot.callsign,
    lifecycle: snapshot.lifecycle,
    hasFocal: snapshot.focalLat != null && snapshot.focalLon != null,
    focalLat: snapshot.focalLat ?? null,
    focalLon: snapshot.focalLon ?? null,
    settled: Boolean(snapshot.settled),
    lostSignal: Boolean(snapshot.lostSignal),
    trackingStatus: snapshot.trackingStatus || "",
  });
}
