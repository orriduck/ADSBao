import assert from "node:assert/strict";

let fetchImpl;
globalThis.fetch = ((...args) => fetchImpl(...args)) as any;

const { nearbyAirportClient } = await import("./nearbyAirportClient");

{
  const calls = [];
  fetchImpl = async (url) => {
    calls.push(url);
    return {
      ok: true,
      status: 200,
      async json() {
        return { airports: [{ icao: "KLGA", distanceNm: 9.3 }] };
      },
    };
  };

  const payload = await nearbyAirportClient.fetchNearbyAirports({
    lat: 40.639928,
    lon: -73.778692,
    icao: "kjfk",
    radiusNm: 30,
    limit: 6,
  });

  assert.equal(
    calls[0],
    "/api/proxy/airports/nearby?lat=40.639928&lon=-73.778692&icao=KJFK&radiusNm=30&limit=6",
  );
  assert.equal(payload.airports[0].icao, "KLGA");
}

{
  fetchImpl = async () => ({
    ok: false,
    status: 404,
    async json() {
      return {};
    },
  });

  const payload = await nearbyAirportClient.fetchNearbyAirports({
    lat: 0,
    lon: 0,
    icao: "KJFK",
  });

  assert.deepEqual(payload, { airports: [] });
}
