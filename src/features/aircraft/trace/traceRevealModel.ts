const TRACE_LABEL_REVEAL_START_RATIO = 0.55;

type TraceRevealPoint = unknown;

type CommittedTraceOptions = {
  aircraftHex?: unknown;
  committedAircraftHex?: unknown;
  tracePoints?: TraceRevealPoint[];
};

type TraceLabelRevealDelayOptions = {
  index?: unknown;
  growthDurationMs?: unknown;
  staggerMs?: unknown;
  reducedMotion?: boolean;
};

type TraceRevealKeyOptions = {
  aircraftHex?: unknown;
  tracePoints?: TraceRevealPoint[];
};

function normalizeAircraftHex(value: unknown) {
  return String(value || "").trim();
}

export function shouldRenderCommittedTrace({
  aircraftHex,
  committedAircraftHex,
  tracePoints = [],
}: CommittedTraceOptions = {}) {
  return (
    normalizeAircraftHex(aircraftHex) !== "" &&
    normalizeAircraftHex(aircraftHex) ===
      normalizeAircraftHex(committedAircraftHex) &&
    Array.isArray(tracePoints) &&
    tracePoints.length >= 2
  );
}

export function getTraceLabelRevealDelay({
  index = 0,
  growthDurationMs,
  staggerMs,
  reducedMotion = false,
}: TraceLabelRevealDelayOptions = {}) {
  if (reducedMotion) return 0;
  return (
    Math.round(Number(growthDurationMs || 0) * TRACE_LABEL_REVEAL_START_RATIO) +
    Math.max(0, Number(index) || 0) * Math.max(0, Number(staggerMs) || 0)
  );
}

export function getTraceRevealKey({ aircraftHex, tracePoints = [] }: TraceRevealKeyOptions = {}) {
  const hex = normalizeAircraftHex(aircraftHex);
  if (!hex || !Array.isArray(tracePoints) || tracePoints.length < 2) return "";
  return hex;
}
