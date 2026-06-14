import assert from "node:assert/strict";

import { createRateLimiter } from "./rateLimiter";
import { normalizeFlightRoute } from "./flight-routes/flightRouteNormalizer";
import { normalizeLocalWeather } from "../weather/localWeatherNormalizer";

{
  const limiter = createRateLimiter({ maxTokens: 1, refillMs: 5 });
  await limiter.acquire();
  const start = Date.now();
  await limiter.acquire();
  assert.ok(Date.now() - start >= 3);
}

{
  const route = normalizeFlightRoute({
    callsign: " dal123 ",
    airline: {
      name: "Delta Air Lines",
      icao: "dal",
      iconUrl: "https://logos.example.test/DAL.png",
    },
    origin: {
      icao: "egll",
      iata: "lhr",
      name: "Heathrow Airport",
      lat: 51.4706,
      lon: -0.461941,
    },
    destination: {
      icao: "kbos",
      iata: "bos",
      name: "Logan International Airport",
      lat: 42.3643,
      lon: -71.005203,
    },
    source: "vrs-standing-data",
  });

  assert.equal(route.callsign, "DAL123");
  assert.equal(route.airlineIcao, "DAL");
  assert.equal(
    route.airlineIconUrl,
    "https://logos.example.test/DAL.png",
  );
  assert.equal(route.origin.iata, "LHR");
  assert.equal(route.destination.icao, "KBOS");
  assert.equal(route.source, "vrs-standing-data");
}

{
  const route = normalizeFlightRoute({
    callsign: " aal1234 ",
    callsignIata: "aa1234",
    airlineIcao: "aal",
    airlineIata: "aa",
    origin: {
      icao: "kbos",
      iata: "bos",
      lat: 42.3656,
      lon: -71.0096,
    },
    destination: {
      icao: "klax",
      iata: "lax",
      lat: 33.9416,
      lon: -118.4085,
    },
    source: "flightaware",
  });

  assert.equal(route.callsignIata, "AA1234");
  assert.equal(route.airlineIcao, "AAL");
  assert.equal(route.airlineIata, "AA");
  assert.equal(route.source, "flightaware");
}

{
  const weather = normalizeLocalWeather({
    timezone: "America/New_York",
    current: {
      time: "2026-05-06T00:00",
      temperature_2m: "18.4",
      apparent_temperature: "17.9",
      relative_humidity_2m: "72",
      is_day: 1,
      weather_code: "0",
      wind_speed_10m: "11.5",
      wind_direction_10m: "80",
      wind_gusts_10m: "18",
    },
  });

  assert.equal(weather.source, "Open-Meteo");
  assert.equal(weather.temperatureC, 18.4);
  assert.equal(weather.humidity, 72);
  assert.equal(weather.isDay, true);
  assert.equal(weather.windSpeedKt, 11.5);
  assert.equal(weather.timezone, "America/New_York");
}
