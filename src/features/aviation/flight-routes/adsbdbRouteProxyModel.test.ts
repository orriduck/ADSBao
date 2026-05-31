import assert from "node:assert/strict";

import {
  ADSBDB_ROUTE_MISS_STATUS,
  buildAdsbdbCallsignRouteUrl,
  buildAdsbdbRouteResponse,
} from "./adsbdbRouteProxyModel";

assert.equal(
  buildAdsbdbCallsignRouteUrl(" aal 1234 "),
  "https://api.adsbdb.com/v0/callsign/AAL1234",
);
assert.equal(buildAdsbdbCallsignRouteUrl("bad-call"), "");
assert.equal(ADSBDB_ROUTE_MISS_STATUS, 200);

const adsbdbPayload = {
  response: {
    flightroute: {
      callsign: "AAL1234",
      callsign_icao: "AAL",
      callsign_iata: "AA",
      airline: { name: "American Airlines", icao: "AAL", iata: "AA" },
      origin: {
        country_iso_name: "US",
        country_name: "United States",
        elevation: 13,
        iata_code: "JFK",
        icao_code: "KJFK",
        latitude: 40.6413,
        longitude: -73.7781,
        municipality: "New York",
        name: "John F Kennedy International Airport",
      },
      destination: {
        country_iso_name: "US",
        elevation: 19,
        iata_code: "BOS",
        icao_code: "KBOS",
        latitude: 42.3656,
        longitude: -71.0096,
        municipality: "Boston",
        name: "Boston Logan International Airport",
      },
    },
  },
};

const route = buildAdsbdbRouteResponse("aal1234", adsbdbPayload);
assert.equal(route.callsign, "AAL1234");
assert.equal(route.callsignIcao, "AAL");
assert.equal(route.callsignIata, "AA");
assert.equal(route.origin.icao, "KJFK");
assert.equal(route.origin.iata, "JFK");
assert.equal(route.origin.municipality, "New York");
assert.equal(route.origin.country, "US");
assert.equal(route.destination.icao, "KBOS");
assert.equal(route.destination.iata, "BOS");
assert.equal(route.route.icao, "KJFK-KBOS");
assert.equal(route.route.iata, "JFK-BOS");
assert.equal(route.airline.icao, "AAL");
assert.equal(route.airline.iata, "AA");
assert.equal(route.airline.name, "American Airlines");
assert.equal(route.source, "adsbdb");
assert.equal(route.confidence, "reference-data");
assert.equal(route.airports.length, 2);

// Missing origin/destination coordinates → no route. Routes coloring the
// markers depends on coordinates downstream, so a partial response must be
// treated as a miss rather than letting NaN propagate.
assert.equal(
  buildAdsbdbRouteResponse("AAL1234", {
    response: {
      flightroute: {
        callsign: "AAL1234",
        origin: { icao_code: "KJFK", latitude: 40.6413 },
        destination: {
          icao_code: "KBOS",
          latitude: 42.3656,
          longitude: -71.0096,
        },
      },
    },
  }),
  null,
);

// Unknown callsign body shapes (and empty payloads) must return null.
assert.equal(buildAdsbdbRouteResponse("AAL1234", null), null);
assert.equal(
  buildAdsbdbRouteResponse("AAL1234", { response: "Unknown callsign" }),
  null,
);

// Invalid airline code falls back to first three characters of the callsign
// so downstream rendering still has a stable airline icao to key off of.
const fallbackAirline = buildAdsbdbRouteResponse("ZZZ9999", {
  response: {
    flightroute: {
      callsign: "ZZZ9999",
      airline: { icao: "?", iata: "" },
      origin: {
        icao_code: "KJFK",
        iata_code: "JFK",
        latitude: 40.6413,
        longitude: -73.7781,
      },
      destination: {
        icao_code: "KBOS",
        iata_code: "BOS",
        latitude: 42.3656,
        longitude: -71.0096,
      },
    },
  },
});
assert.equal(fallbackAirline.airline.icao, "ZZZ");
