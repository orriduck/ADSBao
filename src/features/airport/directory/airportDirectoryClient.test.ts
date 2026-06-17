import assert from "node:assert/strict";

let fetchImpl;
globalThis.fetch = ((...args) => fetchImpl(...args)) as any;

const { createAirportDirectoryClient } = await import("./airportDirectoryClient");

const createClient = () =>
  createAirportDirectoryClient({
    fetchImpl: (...args) => fetchImpl(...args),
  });

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

  const result = await createClient().loadAirports({
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

  await createClient().loadAirports({ country: "US", kind: "all", limit: 12 });
  assert.equal(calls.length, 1);
  assert.doesNotMatch(calls[0], /type=/);
}

// resolveAirport hits the fast airport-detail route and leaves heavy context
// empty until resolveAirportContext hydrates it separately.
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
        runwayMap: { airport: "KBOS", source: "OurAirports", runways: [] },
        surfaceMap: null,
        source: "openaip",
      });
    }
    throw new Error(`unexpected url: ${url}`);
  };

  const airport = await createClient().resolveAirport("kbos");
  assert.deepEqual(calls, ["/api/airport/KBOS"]);
  assert.equal(airport.icao, "KBOS");
  assert.equal(airport.iata, "BOS");
  assert.deepEqual(airport.nearbyNavaids, []);
  assert.deepEqual(airport.airspaces, []);
  assert.deepEqual(airport.reportingPoints, []);
  assert.deepEqual(airport.obstacles, []);
  assert.deepEqual(airport.runwayMap, { airport: "KBOS", source: "OurAirports", runways: [] });
  assert.equal(airport.surfaceMap, null);
}

// concurrent identical requests share a single in-flight fetch instead of
// doubling the route transition wait.
{
  const calls = [];
  let resolveResponse;
  fetchImpl = async (url) => {
    calls.push(url);
    return new Promise((resolve) => {
      resolveResponse = () =>
        resolve(
          createJsonResponse({
            airport: KBOS,
            runways: [],
            frequencies: [],
          }),
        );
    });
  };

  const client = createClient();
  const first = client.resolveAirport("kbos");
  const second = client.resolveAirport("KBOS");
  assert.equal(calls.length, 1);
  resolveResponse();
  const [firstAirport, secondAirport] = await Promise.all([first, second]);
  assert.equal(firstAirport.icao, "KBOS");
  assert.equal(secondAirport.icao, "KBOS");
  assert.deepEqual(calls, ["/api/airport/KBOS"]);
}

// resolved airport detail responses are kept briefly so returning to the
// same airport does not re-fetch the static profile/context payloads.
{
  const calls = [];
  fetchImpl = async (url) => {
    calls.push(url);
    return createJsonResponse({
      airport: KBOS,
      runways: [],
      frequencies: [],
    });
  };

  const client = createClient();
  const first = await client.resolveAirport("kbos");
  const second = await client.resolveAirport("KBOS");
  assert.equal(first.icao, "KBOS");
  assert.equal(second.icao, "KBOS");
  assert.deepEqual(calls, ["/api/airport/KBOS"]);
}

// resolveAirportSurface loads the deferred OSM surface payload separately.
{
  const calls = [];
  fetchImpl = async (url) => {
    calls.push(url);
    if (url === "/api/airport/KBOS/surface") {
      return createJsonResponse({
        surfaceMap: {
          airport: "KBOS",
          source: "OpenStreetMap",
          features: { type: "FeatureCollection", features: [] },
        },
      });
    }
    throw new Error(`unexpected url: ${url}`);
  };

  const surfaceMap = await createClient().resolveAirportSurface("kbos");
  assert.deepEqual(calls, ["/api/airport/KBOS/surface"]);
  assert.equal(surfaceMap.source, "OpenStreetMap");
}

// resolveAirportContext loads the deferred airspace/navaid/obstacle payload.
{
  const calls = [];
  fetchImpl = async (url) => {
    calls.push(url);
    if (url === "/api/airport/KBOS/context") {
      return createJsonResponse({
        nearbyAirports: [{ icao: "KOWD" }],
        nearbyNavaids: [{ ident: "BOS", type: "VORTAC" }],
        airspaces: [{ id: "asp-1", name: "BOSTON CLASS B" }],
        reportingPoints: [{ id: "pt-1", name: "HYLND" }],
        obstacles: [{ id: "obs-1", name: "Tower" }],
      });
    }
    throw new Error(`unexpected url: ${url}`);
  };

  const context = await createClient().resolveAirportContext("kbos");
  assert.deepEqual(calls, ["/api/airport/KBOS/context"]);
  assert.deepEqual(context.nearbyAirports, [{ icao: "KOWD" }]);
  assert.deepEqual(context.nearbyNavaids, [{ ident: "BOS", type: "VORTAC" }]);
  assert.deepEqual(context.airspaces, [{ id: "asp-1", name: "BOSTON CLASS B" }]);
  assert.deepEqual(context.reportingPoints, [{ id: "pt-1", name: "HYLND" }]);
  assert.deepEqual(context.obstacles, [{ id: "obs-1", name: "Tower" }]);
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

  const airport = await createClient().resolveAirport("zspd", { locale: "zh-CN" });
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

  const airport = await createClient().resolveAirport("KBOS");
  assert.equal(calls.length, 2);
  assert.equal(calls[0], "/api/airport/KBOS");
  assert.match(calls[1], /^\/api\/search\?.*q=KBOS/);
  assert.equal(airport.icao, "KBOS");
}

// resolveAirport throws when neither path returns data
{
  fetchImpl = async () => createJsonResponse({ error: "no" }, 404);

  await assert.rejects(() => createClient().resolveAirport("ZZZZ"), /Airport not found/);
}

// resolveAirport rejects empty code
{
  fetchImpl = async () => createJsonResponse({});
  await assert.rejects(() => createClient().resolveAirport(""), /Airport code is required/);
}

console.log("airportDirectory.test.ts: ok");
