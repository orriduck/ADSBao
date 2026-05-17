export const AIRCRAFT_POSITIONS_USER_AGENT =
  "ADSBao/0.12.0 (https://github.com/orriduck/ADSBao)";

export const AIRCRAFT_POSITIONS_MAX_BYTES = 2 * 1024 * 1024;

export class AircraftPositionProviderError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = "AircraftPositionProviderError";
    this.status = status;
  }
}
