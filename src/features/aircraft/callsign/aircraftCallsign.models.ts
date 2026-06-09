import { buildAdsbaoUserAgent } from "../../../config/siteMeta";

export const AIRCRAFT_CALLSIGN_USER_AGENT = buildAdsbaoUserAgent();

export const AIRCRAFT_CALLSIGN_MAX_BYTES = 1 * 1024 * 1024;

export const AIRCRAFT_CALLSIGN_PROVIDER_TIMEOUT_MS = 4_000;

export class AircraftCallsignProviderError extends Error {
  status: number | null;
  attempts?: string[];

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "AircraftCallsignProviderError";
    this.status = status;
  }
}
