import { AIRCRAFT_TRAFFIC_CONFIG } from "../../config/aviation";
import { createAircraftCallsignClient } from "../aircraft/callsign/aircraftCallsignClient";
import { createAircraftPhotoClient } from "../aircraft/photos/aircraftPhotoClient";
import { createAircraftPositionClient } from "../aircraft/positions/aircraftPositionClient";
import { createAircraftTraceClient } from "../aircraft/trace/aircraftTraceClient";
import { createFlightRouteClient } from "./flight-routes/flightRouteClient";
import { createLocalWeatherClient } from "../weather/localWeatherClient";
import { createMetarClient } from "../weather/metar/metarClient";

export { createAircraftCallsignClient } from "../aircraft/callsign/aircraftCallsignClient";
export { createAircraftPhotoClient } from "../aircraft/photos/aircraftPhotoClient";
export { createAircraftPositionClient } from "../aircraft/positions/aircraftPositionClient";
export { createAircraftTraceClient } from "../aircraft/trace/aircraftTraceClient";
export { createFlightRouteClient } from "./flight-routes/flightRouteClient";
export { normalizeFlightRoute } from "./flight-routes/flightRouteNormalizer";
export { createLocalWeatherClient } from "../weather/localWeatherClient";
export { normalizeLocalWeather } from "../weather/localWeatherNormalizer";
export { createMetarClient } from "../weather/metar/metarClient";
export { createRateLimiter } from "./rateLimiter";

export const DEFAULT_AIRCRAFT_POLL_MS = AIRCRAFT_TRAFFIC_CONFIG.pollMs;
export const DEFAULT_AIRCRAFT_RANGE_NM = AIRCRAFT_TRAFFIC_CONFIG.rangeNm;

export const metarClient = createMetarClient();
export const aircraftCallsignClient = createAircraftCallsignClient();
export const aircraftPhotoClient = createAircraftPhotoClient();
export const aircraftPositionClient = createAircraftPositionClient();
export const aircraftTraceClient = createAircraftTraceClient();
export const flightRouteClient = createFlightRouteClient();
export const localWeatherClient = createLocalWeatherClient();
