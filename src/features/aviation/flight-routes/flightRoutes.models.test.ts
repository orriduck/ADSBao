import assert from "node:assert/strict";

import {
  buildRouteCacheHeaders,
  compactFlightRoutePayload,
} from "./flightRoutes.models";

assert.deepEqual(
  buildRouteCacheHeaders(
    { source: "flightaware", callsign: "RPA4397" },
    { bypassSharedCache: true },
  ),
  { "Cache-Control": "no-store" },
);

assert.equal(
  buildRouteCacheHeaders({ source: "adsbdb", callsign: "RPA4397" })[
    "Cache-Control"
  ],
  "public, max-age=0, s-maxage=3600, stale-while-revalidate=600",
);

{
  const compact = compactFlightRoutePayload({
    callsign: "AAL1234",
    callsignIcao: "AAL1234",
    callsignIata: "AA1234",
    number: "1234",
    airline: {
      icao: "AAL",
      iata: "AA",
      name: "American Airlines",
      iconUrl: "https://www.flightaware.com/images/airline_logos/90p/AAL.png",
    },
    origin: {
      icao: "KBOS",
      iata: "BOS",
      name: "Boston Logan",
      municipality: "Boston",
      country: "US",
      lat: 42.3656,
      lon: -71.0096,
    },
    destination: {
      icao: "KLAX",
      iata: "LAX",
      name: "Los Angeles Intl",
      municipality: "Los Angeles",
      country: "US",
      lat: 33.9416,
      lon: -118.4085,
    },
    route: { icao: "KBOS-KLAX", iata: "BOS-LAX" },
    airports: [{ icao: "KBOS" }, { icao: "KLAX" }],
    source: "flightaware",
    confidence: "scraped-reference",
  });

  assert.deepEqual(compact, {
    callsign: "AAL1234",
    callsignIcao: "AAL1234",
    callsignIata: "AA1234",
    airlineIcao: "AAL",
    airlineIata: "AA",
    origin: { icao: "KBOS", iata: "BOS", lat: 42.3656, lon: -71.0096 },
    destination: { icao: "KLAX", iata: "LAX", lat: 33.9416, lon: -118.4085 },
    route: { icao: "KBOS-KLAX", iata: "BOS-LAX" },
    source: "flightaware",
    confidence: "scraped-reference",
  });
}

console.log("flightRoutes.models.test.ts ok");
