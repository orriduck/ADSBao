import assert from "node:assert/strict";

import {
  buildFlightAwareCallsignRouteUrl,
  buildFlightAwareRouteResponse,
  parseFlightAwareRoutePage,
} from "./flightawareRouteProxyModel.js";

const sampleFlightAwareHtml = `
  <title>AA1234 (AAL1234) American Airlines Flight Tracking and History - FlightAware</title>
  <meta name="origin" content="KDFW" />
  <meta name="destination" content="KMKE" />
  <meta name="airline" content="AAL" />
  <meta name="twitter:description" content="Track American Airlines (AA) #1234 flight from Dallas-Fort Worth Intl to Milwaukee Mitchell Intl Airport" />
`;

assert.equal(
  buildFlightAwareCallsignRouteUrl(" aal 1234 "),
  "https://www.flightaware.com/live/flight/AAL1234",
);
assert.equal(buildFlightAwareCallsignRouteUrl("bad-call"), "");

const parsed = parseFlightAwareRoutePage("aal1234", sampleFlightAwareHtml);
assert.equal(parsed.callsign, "AAL1234");
assert.equal(parsed.callsignIcao, "AAL1234");
assert.equal(parsed.callsignIata, "AA1234");
assert.equal(parsed.number, "1234");
assert.equal(parsed.airline.icao, "AAL");
assert.equal(parsed.airline.iata, "AA");
assert.equal(parsed.airline.name, "American Airlines");
assert.equal(
  parsed.airline.iconUrl,
  "https://www.flightaware.com/images/airline_logos/90p/AAL.png",
);
assert.equal(parsed.originIcao, "KDFW");
assert.equal(parsed.destinationIcao, "KMKE");

const airports = {
  KDFW: {
    icao: "KDFW",
    iata: "DFW",
    name: "Dallas-Fort Worth International Airport",
    city: "Dallas-Fort Worth",
    country: "US",
    lat: 32.8968,
    lon: -97.038,
  },
  KMKE: {
    icao: "KMKE",
    iata: "MKE",
    name: "Milwaukee Mitchell International Airport",
    city: "Milwaukee",
    country: "US",
    lat: 42.9472,
    lon: -87.8966,
  },
};

const route = await buildFlightAwareRouteResponse({
  callsign: "AAL1234",
  html: sampleFlightAwareHtml,
  resolveAirportByIdent: async (ident) => airports[ident] || null,
});

assert.equal(route.callsign, "AAL1234");
assert.equal(route.callsignIata, "AA1234");
assert.equal(route.airline.icao, "AAL");
assert.equal(route.airline.iconUrl, parsed.airline.iconUrl);
assert.equal(route.origin.icao, "KDFW");
assert.equal(route.origin.iata, "DFW");
assert.equal(route.destination.icao, "KMKE");
assert.equal(route.destination.iata, "MKE");
assert.equal(route.route.icao, "KDFW-KMKE");
assert.equal(route.route.iata, "DFW-MKE");
assert.equal(route.source, "flightaware");
assert.equal(route.confidence, "scraped-reference");

assert.equal(
  await buildFlightAwareRouteResponse({
    callsign: "AAL1234",
    html: sampleFlightAwareHtml,
    resolveAirportByIdent: async (ident) =>
      ident === "KDFW" ? airports.KDFW : null,
  }),
  null,
);
