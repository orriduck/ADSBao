import { buildAdsbaoUserAgent } from "../../../config/siteMeta";

export const AIRCRAFT_TRACE_USER_AGENT = buildAdsbaoUserAgent();

// Full traces for long-haul flights can run several MB — bump the
// upstream-response cap accordingly. Recent traces are still small.
export const AIRCRAFT_TRACE_MAX_BYTES = 24 * 1024 * 1024;

export class AircraftTraceProviderError extends Error {
  status: number | null;
  attempts?: string[];

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "AircraftTraceProviderError";
    this.status = status;
  }
}
