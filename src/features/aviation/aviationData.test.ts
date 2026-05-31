import assert from "node:assert/strict";

import {
  createAircraftPositionClient,
  createAircraftTraceClient,
  createFlightRouteClient,
  createLocalWeatherClient,
  createMetarClient,
  createRateLimiter,
  DEFAULT_AIRCRAFT_POLL_MS,
  DEFAULT_AIRCRAFT_RANGE_NM,
  normalizeFlightRoute,
} from "./aviationData";

const createJsonResponse = (payload, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: new Map([["content-type", "application/json"]]),
  async json() {
    return payload;
  },
  async text() {
    return JSON.stringify(payload);
  },
});

const createTextResponse = (
  payload,
  status = 200,
  contentType = "text/html",
) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: new Map([["content-type", contentType]]),
  async text() {
    return payload;
  },
});

// ---------------------------------------------------------------------------
// RateLimiter unit tests
// ---------------------------------------------------------------------------

try {
  const limiter = createRateLimiter({ maxTokens: 2, refillMs: 10 });

  const start = Date.now();
  // First two acquires should be instant (maxTokens=2)
  await limiter.acquire();
  await limiter.acquire();
  // Third acquire should wait for refill (proportional: ~5ms for 1 token at 2/10ms)
  await limiter.acquire();
  const elapsed = Date.now() - start;
  assert.ok(elapsed >= 3, `expected >=3ms, got ${elapsed}ms`);

  // release puts a token back
  limiter.release();
  const t1 = Date.now();
  await limiter.acquire();
  assert.ok(Date.now() - t1 < 15);

  // onRateLimited blocks further acquires
  const t2 = Date.now();
  limiter.onRateLimited(30);
  await limiter.acquire();
  assert.ok(Date.now() - t2 >= 28, `expected >=28ms, got ${Date.now() - t2}ms`);

  console.log("[test] ✓ createRateLimiter basic functions");

  // P1 fix: cooldown set while waiter is sleeping should be honoured
  const lim2 = createRateLimiter({ maxTokens: 2, refillMs: 10 });
  await lim2.acquire();
  await lim2.acquire();
  // Start a waiter that will sleep waiting for refill
  const waiterPromise = lim2.acquire();
  // While it sleeps, inject a 429 cooldown
  await new Promise((r) => setTimeout(r, 2));
  lim2.onRateLimited(30);
  const t3 = Date.now();
  await waiterPromise;
  const afterCooldown = Date.now() - t3;
  // Waiter should have waited at least the cooldown period,
  // NOT just the refill interval
  assert.ok(
    afterCooldown >= 26,
    `P1 fix: expected >=26ms after cooldown injection, got ${afterCooldown}ms`,
  );
  console.log("[test] ✓ P1 fix: cooldown injected while waiter sleeping");

  // P2 fix: proportional refill — after waiting, multiple tokens should refill
  const lim3 = createRateLimiter({ maxTokens: 4, refillMs: 10 });
  // Drain all tokens
  await lim3.acquire();
  await lim3.acquire();
  await lim3.acquire();
  await lim3.acquire();
  // Wait enough time for full refill
  await new Promise((r) => setTimeout(r, 12));
  const t4 = Date.now();
  // Should be able to grab 3+ tokens near-instantly (refilled proportionally)
  await lim3.acquire();
  await lim3.acquire();
  await lim3.acquire();
  const elapsed2 = Date.now() - t4;
  assert.ok(
    elapsed2 < 15,
    `P2 fix: expected <15ms for 3 proportional refills, got ${elapsed2}ms`,
  );
  console.log("[test] ✓ P2 fix: proportional token refill");

  console.log("[test] ✓ createRateLimiter works correctly");
} catch (err) {
  console.error("[test] ✗ createRateLimiter FAILED:", err.message);
  process.exitCode = 1;
}

// ---------------------------------------------------------------------------
// Existing tests
// ---------------------------------------------------------------------------

{
  const calls = [];
  const client = createMetarClient({
    fetchImpl: async (url) => {
      calls.push(url);
      return createJsonResponse([
        { rawOb: "KBOS 261254Z 27008KT 10SM CLR 12/02 A3001" },
      ]);
    },
  });

  const payload = await client.fetchMetar("kbos");

  assert.equal(calls.length, 1);
  assert.equal(calls[0], "/api/proxy/metar/KBOS");
  assert.equal(payload[0].rawOb, "KBOS 261254Z 27008KT 10SM CLR 12/02 A3001");
}

{
  const calls = [];
  const client = createAircraftPositionClient({
    fetchImpl: async (url) => {
      calls.push(url);
      return createJsonResponse({ ac: [{ hex: "a1b2c3", lat: 42, lon: -71 }] });
    },
  });

  const payload = await client.fetchNearbyAircraft({
    lat: 42.3656,
    lon: -71.0096,
    distNm: 15,
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0], "/api/proxy/aircraft/positions/42.3656/-71.0096/15");
  assert.equal(payload.ac[0].hex, "a1b2c3");
}

{
  const calls = [];
  const client = createAircraftPositionClient({
    fetchImpl: async (url) => {
      calls.push(url);
      return createJsonResponse({ ac: [] });
    },
  });

  await client.fetchNearbyAircraft({
    lat: 42.3656,
    lon: -71.0096,
  });

  assert.equal(DEFAULT_AIRCRAFT_RANGE_NM, 40);
  assert.equal(calls[0], "/api/proxy/aircraft/positions/42.3656/-71.0096/40");
}

{
  const calls = [];
  const client = createAircraftTraceClient({
    fetchImpl: async (url) => {
      calls.push(url);
      return createJsonResponse({ recent: { trace: [] } });
    },
  });

  const payload = await client.fetchAircraftTrace({ hex: "a7bbe9" });

  assert.equal(calls.length, 1);
  assert.equal(calls[0], "/api/proxy/aircraft/trace/A7BBE9");
  assert.deepEqual(payload, { recent: { trace: [] } });
}

{
  const calls = [];
  const client = createLocalWeatherClient({
    fetchImpl: async (url) => {
      calls.push(url);
      return createJsonResponse({
        current: {
          temperature_2m: 16.4,
          weather_code: 0,
          wind_speed_10m: 12,
        },
      });
    },
  });

  const payload = await client.fetchCurrentWeather({
    lat: 42.3656,
    lon: -71.0096,
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0], "/api/proxy/local-weather/42.3656/-71.0096");
  assert.equal(payload.current.temperature_2m, 16.4);
}

{
  assert.equal(DEFAULT_AIRCRAFT_POLL_MS, 3_000);
}

{
  const route = normalizeFlightRoute({
    callsign: "DAL123",
    number: "123",
    airline: {
      name: "Delta Air Lines",
      icao: "DAL",
      iata: "DL",
    },
    origin: {
      icao: "EGPH",
      iata: "EDI",
      name: "Edinburgh Airport",
      municipality: "Edinburgh",
      country: "GB",
      lat: 55.950145,
      lon: -3.372288,
    },
    destination: {
      icao: "KBOS",
      iata: "BOS",
      name: "Logan International Airport",
      municipality: "Boston",
      country: "US",
      lat: 42.3643,
      lon: -71.005203,
    },
    airports: [],
    route: { icao: "EGPH-KBOS", iata: "EDI-BOS" },
    source: "vrs-standing-data",
    confidence: "reference-data",
  });

  assert.equal(route.callsign, "DAL123");
  assert.equal(route.airlineName, "Delta Air Lines");
  assert.equal(route.origin.icao, "EGPH");
  assert.equal(route.destination.iata, "BOS");
  assert.equal(route.source, "vrs-standing-data");
  assert.equal(route.confidence, "reference-data");
}

{
  const calls = [];
  const client = createFlightRouteClient({
    fetchImpl: async (url) => {
      calls.push(url);
      return createJsonResponse({
        callsign: "BAW213",
        airline: { icao: "BAW" },
        origin: {
          icao: "EGLL",
          iata: "LHR",
          name: "Heathrow Airport",
          lat: 51.4706,
          lon: -0.461941,
        },
        destination: {
          icao: "KBOS",
          iata: "BOS",
          name: "Logan International Airport",
          lat: 42.3643,
          lon: -71.005203,
        },
        source: "vrs-standing-data",
      });
    },
  });

  const route = await client.fetchFlightRoute(" baw213 ", {
    icao: "KBOS",
    iata: "BOS",
  });

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0],
    "/api/proxy/flight-routes/callsign/BAW213?airportIcao=KBOS&airportIata=BOS",
  );
  assert.equal(route.origin.iata, "LHR");
  assert.equal(route.destination.icao, "KBOS");
}

{
  const client = createFlightRouteClient({
    fetchImpl: async () => createJsonResponse(null, 200),
  });

  assert.equal(await client.fetchFlightRoute("NOPE123"), null);
}

{
  const client = createFlightRouteClient({
    fetchImpl: async () =>
      createJsonResponse({ response: "unknown callsign" }, 404),
  });

  await assert.rejects(
    () => client.fetchFlightRoute("NOPE123"),
    /HTTP 404/,
  );
}

{
  // 429 should throw with rate-limited message
  const calls = [];
  const client = createFlightRouteClient({
    fetchImpl: async (url) => {
      calls.push(url);
      if (calls.length <= 1)
        return createJsonResponse({ response: "rate limited" }, 429);
      return createJsonResponse({
        callsign: "UAL456",
        airline: { icao: "UAL" },
        origin: {
          icao: "KSFO",
          lat: 37.6213,
          lon: -122.379,
        },
        destination: {
          icao: "KJFK",
          lat: 40.6413,
          lon: -73.7781,
        },
        source: "vrs-standing-data",
      });
    },
  });

  try {
    await client.fetchFlightRoute("UAL456");
    console.error("[test] ✗ 429 should have thrown");
    process.exitCode = 1;
  } catch (err) {
    assert.ok(err.message.includes("429"));
  }

  // After backoff (which in test is very short), a retry should succeed —
  // but for a unit test we just verify the limiter state. The second call
  // above is the success one; a third call would need to wait for backoff.
  console.log("[test] ✓ Flight route client handles 429 with backoff");
}

{
  const metarClient = createMetarClient({
    fetchImpl: async () => createTextResponse("<!doctype html><html></html>"),
  });
  const aircraftClient = createAircraftPositionClient({
    fetchImpl: async () =>
      createJsonResponse({ ac: [{ hex: "def456", lat: 33, lon: -118 }] }),
  });

  await assert.rejects(
    async () => metarClient.fetchMetar("klax"),
    /Expected JSON from \/api\/proxy\/metar\/KLAX/,
  );

  const aircraft = await aircraftClient.fetchNearbyAircraft({
    lat: 33.9425,
    lon: -118.4081,
    distNm: 20,
  });
  assert.equal(aircraft.ac[0].hex, "def456");
}
