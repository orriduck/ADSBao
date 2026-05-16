import assert from "node:assert/strict";

import {
  buildVrsRouteResponse,
  buildVrsRouteUrl,
  normalizeRouteCallsign,
  shouldUseAerodataboxFallback,
  VRS_ROUTE_MISS_STATUS,
} from "./vrsRouteProxyModel.js";

const italyToAmsterdam = {
  callsign: "ITY110",
  number: "110",
  airline_code: "ITY",
  airport_codes: "LIRF-EHAM",
  _airport_codes_iata: "FCO-AMS",
  _airports: [
    {
      name: "Leonardo Da Vinci (Fiumicino) International Airport",
      icao: "LIRF",
      iata: "FCO",
      location: "Rome",
      countryiso2: "IT",
      lat: 41.804501,
      lon: 12.2508,
    },
    {
      name: "Amsterdam Airport Schiphol",
      icao: "EHAM",
      iata: "AMS",
      location: "Amsterdam",
      countryiso2: "NL",
      lat: 52.308601,
      lon: 4.76389,
    },
  ],
};

assert.equal(normalizeRouteCallsign(" ity 110 "), "ITY110");
assert.equal(normalizeRouteCallsign("bad-call"), "");
assert.equal(
  buildVrsRouteUrl("ity110"),
  "https://vrs-standing-data.adsb.lol/routes/IT/ITY110.json",
);
assert.equal(VRS_ROUTE_MISS_STATUS, 200);

const response = buildVrsRouteResponse("ity110", italyToAmsterdam);

assert.equal(response.callsign, "ITY110");
assert.equal(response.number, "110");
assert.equal(response.airline.icao, "ITY");
assert.equal(response.airline.iata, "");
assert.equal(response.origin.icao, "LIRF");
assert.equal(response.origin.iata, "FCO");
assert.equal(response.origin.municipality, "Rome");
assert.equal(response.origin.country, "IT");
assert.equal(response.destination.icao, "EHAM");
assert.equal(response.route.icao, "LIRF-EHAM");
assert.equal(response.route.iata, "FCO-AMS");
assert.equal(response.airports.length, 2);
assert.equal(response.source, "vrs-standing-data");
assert.equal(response.confidence, "reference-data");

const multiLeg = buildVrsRouteResponse("BAW123", {
  callsign: "BAW123",
  number: "123",
  airline_code: "BAW",
  airport_codes: "EGLL-KBOS-KJFK",
  _airport_codes_iata: "LHR-BOS-JFK",
  _airports: [
    { icao: "EGLL", iata: "LHR", lat: 51.4706, lon: -0.461941 },
    { icao: "KBOS", iata: "BOS", lat: 42.3643, lon: -71.005203 },
    { icao: "KJFK", iata: "JFK", lat: 40.6413, lon: -73.7781 },
  ],
});

assert.equal(multiLeg.origin.icao, "EGLL");
assert.equal(multiLeg.destination.icao, "KJFK");
assert.equal(multiLeg.airports[1].icao, "KBOS");
assert.equal(
  shouldUseAerodataboxFallback(multiLeg, {
    icao: "KBOS",
    iata: "BOS",
  }),
  true,
);
assert.equal(
  shouldUseAerodataboxFallback(response, {
    icao: "EHAM",
    iata: "AMS",
  }),
  false,
);
assert.equal(
  shouldUseAerodataboxFallback(response, {
    icao: "KBOS",
    iata: "BOS",
  }),
  true,
);
assert.equal(
  shouldUseAerodataboxFallback(
    {
      ...response,
      origin: { ...response.origin, icao: "KAAA", iata: "AAA" },
      destination: { ...response.destination, icao: "KBBB", iata: "BBB" },
      airports: [
        { ...response.origin, icao: "KAAA", iata: "AAA" },
        { ...response.destination, icao: "KBBB", iata: "BBB" },
      ],
    },
    {
      icao: "LIRF",
      iata: "FCO",
    },
  ),
  true,
);
assert.equal(
  shouldUseAerodataboxFallback(
    {
      ...response,
      origin: { ...response.origin, icao: "KAAA", iata: "AAA" },
      destination: { ...response.destination, icao: "KBBB", iata: "BBB" },
      airports: [
        { ...response.origin, icao: "KAAA", iata: "AAA" },
        response.origin,
      ],
    },
    {
      icao: "LIRF",
      iata: "FCO",
    },
  ),
  false,
);

assert.equal(
  buildVrsRouteResponse("NOPE123", {
    callsign: "NOPE123",
    airport_codes: "unknown",
    _airports: [],
  }),
  null,
);

assert.equal(
  buildVrsRouteResponse("BAD123", {
    callsign: "BAD123",
    airport_codes: "KBOS-KJFK",
    _airports: [
      { icao: "KBOS", lat: 42.3643 },
      { icao: "KJFK", lat: 40.6413, lon: -73.7781 },
    ],
  }),
  null,
);
