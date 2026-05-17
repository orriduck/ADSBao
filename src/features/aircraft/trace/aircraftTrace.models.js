export const AIRCRAFT_TRACE_USER_AGENT =
  "ADSBao/1.2.0 (https://github.com/orriduck/ADSBao)";

// Full traces for long-haul flights can run several MB — bump the
// upstream-response cap accordingly. Recent traces are still small.
export const AIRCRAFT_TRACE_MAX_BYTES = 24 * 1024 * 1024;

export class AircraftTraceProviderError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = "AircraftTraceProviderError";
    this.status = status;
  }
}
