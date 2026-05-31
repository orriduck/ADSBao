import { buildAdsbaoUserAgent } from "../../../config/siteMeta";

export const AIRCRAFT_CALLSIGN_USER_AGENT = buildAdsbaoUserAgent();

export const AIRCRAFT_CALLSIGN_MAX_BYTES = 1 * 1024 * 1024;

export class AircraftCallsignProviderError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = "AircraftCallsignProviderError";
    this.status = status;
  }
}
