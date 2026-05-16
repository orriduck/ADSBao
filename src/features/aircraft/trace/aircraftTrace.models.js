export const AIRCRAFT_TRACE_USER_AGENT =
  "ADSBao/0.11.0 (https://github.com/orriduck/ADSBao)";

export const AIRCRAFT_TRACE_MAX_BYTES = 6 * 1024 * 1024;

export class AircraftTraceProviderError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = "AircraftTraceProviderError";
    this.status = status;
  }
}
