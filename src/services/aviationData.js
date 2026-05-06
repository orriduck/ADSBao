import { AIRCRAFT_TRAFFIC_CONFIG } from "../config/aviation.js";
import { createAircraftPositionClient } from "./aviation/aircraftPositionClient.js";
import { createFlightRouteClient } from "./aviation/flightRouteClient.js";
import { createLocalWeatherClient } from "./aviation/localWeatherClient.js";
import { createMetarClient } from "./aviation/metarClient.js";

export { createAircraftPositionClient } from "./aviation/aircraftPositionClient.js";
export { createFlightRouteClient } from "./aviation/flightRouteClient.js";
export { normalizeFlightRoute } from "./aviation/flightRouteNormalizer.js";
export { createLocalWeatherClient } from "./aviation/localWeatherClient.js";
export { normalizeLocalWeather } from "./aviation/localWeatherNormalizer.js";
export { createMetarClient } from "./aviation/metarClient.js";
export { createRateLimiter } from "./aviation/rateLimiter.js";

export const DEFAULT_AIRCRAFT_POLL_MS = AIRCRAFT_TRAFFIC_CONFIG.pollMs;
export const DEFAULT_AIRCRAFT_RANGE_NM = AIRCRAFT_TRAFFIC_CONFIG.rangeNm;

export const metarClient = createMetarClient();
export const aircraftPositionClient = createAircraftPositionClient();
export const flightRouteClient = createFlightRouteClient();
export const localWeatherClient = createLocalWeatherClient();
