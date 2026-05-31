import { buildAdsbaoUserAgent } from "../../../config/siteMeta";

export const AIRCRAFT_POSITIONS_USER_AGENT = buildAdsbaoUserAgent();

export const AIRCRAFT_POSITIONS_MAX_BYTES = 2 * 1024 * 1024;

export class AircraftPositionProviderError extends Error {
  status: number | null;
  attempts?: string[];

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "AircraftPositionProviderError";
    this.status = status;
  }
}
