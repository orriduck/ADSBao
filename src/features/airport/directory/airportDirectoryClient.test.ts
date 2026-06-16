import assert from "node:assert/strict";

let fetchImpl;
globalThis.fetch = ((...args) => fetchImpl(...args)) as any;

const { airportDirectoryClient } = await import("./airportDirectoryClient");

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
  source: "openaip",
};

// loadAirports translates kind=all -> no type filter, kind=large_airport -> type=large_airport
{
  const calls = [];
  fetchImpl = async (url) => {
    calls.push(url);
    return createJsonResponse({
      airports: [KBOS],
      source: "openaip",
    });
  };

  const result = await airportDirectoryClient.loadAirports({
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
  assert.equal(result.source, "openaip");
  assert.equal(result.airports[0].icao, "KBOS");
}

// kind=all is not sent as a type filter
{
  const calls = [];
  fetchImpl = async (url) => {
    calls.push(url);
    return createJsonResponse({ airports: [], source: "openaip" });
  };

  await airportDirectoryClient.loadAirports({ country: "US", kind: "all", limit: 12 });
  assert.equal(calls.length, 1);
  assert.doesNotMatch(calls[0], /type=/);
}

// resolveAirport hits the airport-detail route and unwraps .airport
{
  const calls = [];
  fetchImpl = async (url) => {
    calls.push(url);
    if (url === "/api/airport/KBOS") {
      return createJsonResponse({
        airport: KBOS,
        runways: [],
        frequencies: [],
        nearbyAirports: [],
        nearbyNavaids: [{ ident: "BOS", type: "VORTAC" }],
        airspaces: [{ id: "asp-1", name: "BOSTON CLASS B" }],
        reportingPoints: [{ id: "pt-1", name: "HYLND" }],
        obstacles: [{ id: "obs-1", name: "Tower" }],
        runwayMap: { airport: "KBOS", source: "OurAirports", runways: [] },
        surfaceMap: { airport: "KBOS", source: "OpenStreetMap", features: { type: "FeatureCollection", features: [] } },
        source: "openaip",
      });
    }
    throw new Error(`unexpected url: ${url}`);
  };

  const airport = await airportDirectoryClient.resolveAirport("kbos");
  assert.deepEqual(calls, ["/api/airport/KBOS"]);
  assert.equal(airport.icao, "KBOS");
  assert.equal(airport.iata, "BOS");
  assert.deepEqual(airport.nearbyNavaids, [{ ident: "BOS", type: "VORTAC" }]);
  assert.deepEqual(airport.airspaces, [{ id: "asp-1", name: "BOSTON CLASS B" }]);
  assert.deepEqual(airport.reportingPoints, [{ id: "pt-1", name: "HYLND" }]);
  assert.deepEqual(airport.obstacles, [{ id: "obs-1", name: "Tower" }]);
  assert.deepEqual(airport.runwayMap, { airport: "KBOS", source: "OurAirports", runways: [] });
  assert.equal(airport.surfaceMap?.source, "OpenStreetMap");
}

// resolveAirport forwards the active locale so the detail route can enrich
// runtime-only names from localized upstream content.
{
  const calls = [];
  fetchImpl = async (url) => {
    calls.push(url);
    if (url === "/api/airport/ZSPD?locale=zh-CN") {
      return createJsonResponse({
        airport: {
          icao: "ZSPD",
          iata: "PVG",
          name: "Shanghai Pudong International Airport",
          localizedName: "上海浦东国际机场",
        },
      });
    }
    throw new Error(`unexpected url: ${url}`);
  };

  const airport = await airportDirectoryClient.resolveAirport("zspd", { locale: "zh-CN" });
  assert.deepEqual(calls, ["/api/airport/ZSPD?locale=zh-CN"]);
  assert.equal(airport.localizedName, "上海浦东国际机场");
}

// resolveAirport falls back to /api/search when the detail route 404s
{
  const calls = [];
  fetchImpl = async (url) => {
    calls.push(url);
    if (url.startsWith("/api/airport/")) {
      return createJsonResponse({ error: "Airport not found" }, 404);
    }
    if (url.startsWith("/api/search?")) {
      return createJsonResponse({ airports: [KBOS], source: "openaip" });
    }
    throw new Error(`unexpected url: ${url}`);
  };

  const airport = await airportDirectoryClient.resolveAirport("KBOS");
  assert.equal(calls.length, 2);
  assert.equal(calls[0], "/api/airport/KBOS");
  assert.match(calls[1], /^\/api\/search\?.*q=KBOS/);
  assert.equal(airport.icao, "KBOS");
}

// resolveAirport throws when neither path returns data
{
  fetchImpl = async () => createJsonResponse({ error: "no" }, 404);

  await assert.rejects(() => airportDirectoryClient.resolveAirport("ZZZZ"), /Airport not found/);
}

// resolveAirport rejects empty code
{
  fetchImpl = async () => createJsonResponse({});
  await assert.rejects(() => airportDirectoryClient.resolveAirport(""), /Airport code is required/);
}

console.log("airportDirectory.test.ts: ok");
