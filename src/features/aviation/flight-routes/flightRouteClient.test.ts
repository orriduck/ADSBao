import assert from "node:assert/strict";

import { createFlightRouteClient } from "./flightRouteClient";

let requestedUrl = "";
let requestedInit = null;

const routePayload = {
  callsign: "RPA4397",
  airline: { icao: "RPA", iata: "YX", name: "Republic" },
  origin: {
    icao: "KBOS",
    iata: "BOS",
    name: "Boston Logan Intl",
    municipality: "Boston",
    country: "US",
    lat: 42.3656,
    lon: -71.0096,
  },
  destination: {
    icao: "KLGA",
    iata: "LGA",
    name: "LaGuardia",
    municipality: "New York",
    country: "US",
    lat: 40.7772,
    lon: -73.8726,
  },
  route: { icao: "KBOS-KLGA", iata: "BOS-LGA" },
  source: "flightaware",
};

const client = createFlightRouteClient({
  baseUrl: "/api/proxy/flight-routes/callsign",
  fetchImpl: async (url, init) => {
    requestedUrl = url;
    requestedInit = init;
    return new Response(JSON.stringify(routePayload), { status: 200 });
  },
});

const route = await client.fetchFlightRoute(" rpa4397 ", {
  icao: "kbos",
  iata: "bos",
  routeProvider: "flightaware",
});

assert.equal(
  requestedUrl,
  "/api/proxy/flight-routes/callsign/RPA4397?airportIcao=KBOS&airportIata=BOS&provider=flightaware",
);
assert.equal(requestedInit.credentials, "same-origin");
assert.equal(route.source, "flightaware");
assert.equal(route.route.iata, "BOS-LGA");

console.log("flightRouteClient.test.ts ok");
