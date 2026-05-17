import { AIRCRAFT_TRAFFIC_CONFIG } from "../../config/aviation.js";
import { createAircraftCallsignClient } from "../aircraft/callsign/aircraftCallsignClient.js";
import { createAircraftPhotoClient } from "../aircraft/photos/aircraftPhotoClient.js";
import { createAircraftPositionClient } from "../aircraft/positions/aircraftPositionClient.js";
import { createAircraftTraceClient } from "../aircraft/trace/aircraftTraceClient.js";
import { createFlightRouteClient } from "./flight-routes/flightRouteClient.js";
import { createLocalWeatherClient } from "../weather/localWeatherClient.js";
import { createMetarClient } from "../weather/metar/metarClient.js";

export { createAircraftCallsignClient } from "../aircraft/callsign/aircraftCallsignClient.js";
export { createAircraftPhotoClient } from "../aircraft/photos/aircraftPhotoClient.js";
export { createAircraftPositionClient } from "../aircraft/positions/aircraftPositionClient.js";
export { createAircraftTraceClient } from "../aircraft/trace/aircraftTraceClient.js";
export { createFlightRouteClient } from "./flight-routes/flightRouteClient.js";
export { normalizeFlightRoute } from "./flight-routes/flightRouteNormalizer.js";
export { createLocalWeatherClient } from "../weather/localWeatherClient.js";
export { normalizeLocalWeather } from "../weather/localWeatherNormalizer.js";
export { createMetarClient } from "../weather/metar/metarClient.js";
export { createRateLimiter } from "./rateLimiter.js";

export const DEFAULT_AIRCRAFT_POLL_MS = AIRCRAFT_TRAFFIC_CONFIG.pollMs;
export const DEFAULT_AIRCRAFT_RANGE_NM = AIRCRAFT_TRAFFIC_CONFIG.rangeNm;

export const metarClient = createMetarClient();
export const aircraftCallsignClient = createAircraftCallsignClient();
export const aircraftPhotoClient = createAircraftPhotoClient();
export const aircraftPositionClient = createAircraftPositionClient();
export const aircraftTraceClient = createAircraftTraceClient();
export const flightRouteClient = createFlightRouteClient();
export const localWeatherClient = createLocalWeatherClient();
