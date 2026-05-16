import assert from "node:assert/strict";

import { createAirportDirectoryClient } from "./airportDirectoryClient.js";

const createJsonResponse = (payload, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  async json() {
    return payload;
  },
});

const KBOS = {
  ident: "KBOS",
  icao: "KBOS",
  iata: "BOS",
  code: "KBOS",
  name: "Boston Logan International Airport",
  city: "Boston",
  country: "US",
  type: "large_airport",
  type_label: "Large Airport",
  lat: 42.3656,
  lon: -71.0096,
  source: "ourairports",
};

// loadAirports translates kind=all -> no type filter, kind=large_airport -> type=large_airport
{
  const calls = [];
  const client = createAirportDirectoryClient({
    fetchImpl: async (url) => {
      calls.push(url);
      return createJsonResponse({
        airports: [KBOS],
        source: "ourairports",
      });
    },
  });

  const result = await client.loadAirports({
    query: "KBOS",
    country: "us",
    kind: "large_airport",
    limit: 10,
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0], /^\/api\/search\?/);
  assert.match(calls[0], /q=KBOS/);
  assert.match(calls[0], /country=US/);
  assert.match(calls[0], /type=large_airport/);
  assert.match(calls[0], /limit=10/);
  assert.equal(result.source, "ourairports");
  assert.equal(result.airports[0].icao, "KBOS");
}

// kind=all is not sent as a type filter
{
  const calls = [];
  const client = createAirportDirectoryClient({
    fetchImpl: async (url) => {
      calls.push(url);
      return createJsonResponse({ airports: [], source: "ourairports" });
    },
  });

  await client.loadAirports({ country: "US", kind: "all", limit: 12 });
  assert.equal(calls.length, 1);
  assert.doesNotMatch(calls[0], /type=/);
}

// resolveAirport hits the airport-detail route and unwraps .airport
{
  const calls = [];
  const client = createAirportDirectoryClient({
    fetchImpl: async (url) => {
      calls.push(url);
      if (url === "/api/airport/KBOS") {
        return createJsonResponse({
          airport: KBOS,
          runways: [],
          frequencies: [],
          nearbyAirports: [],
          nearbyNavaids: [],
          source: "ourairports",
        });
      }
      throw new Error(`unexpected url: ${url}`);
    },
  });

  const airport = await client.resolveAirport("kbos");
  assert.deepEqual(calls, ["/api/airport/KBOS"]);
  assert.equal(airport.icao, "KBOS");
  assert.equal(airport.iata, "BOS");
}

// resolveAirport falls back to /api/search when the detail route 404s
{
  const calls = [];
  const client = createAirportDirectoryClient({
    fetchImpl: async (url) => {
      calls.push(url);
      if (url.startsWith("/api/airport/")) {
        return createJsonResponse({ error: "Airport not found" }, 404);
      }
      if (url.startsWith("/api/search?")) {
        return createJsonResponse({ airports: [KBOS], source: "ourairports" });
      }
      throw new Error(`unexpected url: ${url}`);
    },
  });

  const airport = await client.resolveAirport("KBOS");
  assert.equal(calls.length, 2);
  assert.equal(calls[0], "/api/airport/KBOS");
  assert.match(calls[1], /^\/api\/search\?.*q=KBOS/);
  assert.equal(airport.icao, "KBOS");
}

// resolveAirport throws when neither path returns data
{
  const client = createAirportDirectoryClient({
    fetchImpl: async () => createJsonResponse({ error: "no" }, 404),
  });

  await assert.rejects(() => client.resolveAirport("ZZZZ"), /Airport not found/);
}

// resolveAirport rejects empty code
{
  const client = createAirportDirectoryClient({
    fetchImpl: async () => createJsonResponse({}),
  });
  await assert.rejects(() => client.resolveAirport(""), /Airport code is required/);
}

console.log("airportDirectory.test.js: ok");
