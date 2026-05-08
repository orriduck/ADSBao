import assert from "node:assert/strict";

import {
  buildFlightAwareRouteResponse,
  extractFlightAwareTargeting,
  normalizeRouteCallsign,
  sanitizeFlightAwareAirportCode,
} from "./flightAwareProxyModel.js";

const html = `
  <script>
    googletag.pubads().setTargeting('origin', 'EGLL');
    googletag.pubads().setTargeting('origin_IATA', 'LHR');
    googletag.pubads().setTargeting('destination', 'KBOS');
    googletag.pubads().setTargeting('destination_IATA', 'BOS');
  </script>
`;

assert.equal(normalizeRouteCallsign(" baw 213 "), "BAW213");
assert.equal(normalizeRouteCallsign("bad-call"), "");
assert.equal(sanitizeFlightAwareAirportCode("kbos", { length: 4 }), "KBOS");
assert.equal(
  sanitizeFlightAwareAirportCode("<script>", { length: 4 }),
  "",
);

assert.deepEqual(extractFlightAwareTargeting(html), {
  origin: { icao: "EGLL", iata: "LHR" },
  destination: { icao: "KBOS", iata: "BOS" },
});

assert.deepEqual(
  extractFlightAwareTargeting(`
    googletag.pubads().setTargeting('origin', '<img src=x>');
    googletag.pubads().setTargeting('origin_IATA', 'LHR');
    googletag.pubads().setTargeting('destination', 'KBOS');
    googletag.pubads().setTargeting('destination_IATA', 'BOS');
    googletag.pubads().setTargeting('unexpected', 'payload');
  `),
  {
    origin: { icao: "", iata: "LHR" },
    destination: { icao: "KBOS", iata: "BOS" },
  },
);

const trackpollHtml = `
  <script>
    var trackpollBootstrap = {
      "flights": {
        "AAL873-1778047830-airline-138p:0": {
          "origin": {
            "iata": "BOS",
            "icao": "KBOS",
            "friendlyName": "Boston Logan Intl",
            "friendlyLocation": "Boston, MA",
            "coord": [-71.0064, 42.3629]
          },
          "destination": {
            "iata": "MIA",
            "icao": "KMIA",
            "friendlyName": "Miami Intl",
            "friendlyLocation": "Miami, FL",
            "coord": [-80.2901, 25.7954]
          },
          "airline": {
            "fullName": "American Airlines Inc.",
            "shortName": "American Airlines",
            "icao": "AAL",
            "iata": "AA",
            "callsign": "American"
          },
          "thumbnail": {
            "imageUrl": "https://www.flightaware.com/images/airline_logos/180px/AAL.png"
          },
          "displayIdent": "AAL873",
          "iataIdent": "AA873",
          "friendlyIdent": "American Airlines 873"
        }
      }
    };
  </script>
`;

const richScrape = extractFlightAwareTargeting(trackpollHtml);

assert.equal(richScrape.origin.name, "Boston Logan Intl");
assert.equal(richScrape.origin.latitude, 42.3629);
assert.equal(richScrape.destination.municipality, "Miami, FL");
assert.equal(richScrape.airline.name, "American Airlines");
assert.equal(richScrape.airline.iata, "AA");
assert.equal(
  richScrape.airline.iconUrl,
  "https://www.flightaware.com/images/airline_logos/180px/AAL.png",
);
assert.equal(richScrape.callsignIata, "AA873");

assert.deepEqual(buildFlightAwareRouteResponse("BAW213", null), {
  response: null,
});

const response = buildFlightAwareRouteResponse("BAW213", {
  origin: { icao: "EGLL", iata: "LHR" },
  destination: { icao: "KBOS", iata: "BOS" },
});

assert.equal(response.response.flightroute.callsign, "BAW213");
assert.equal(response.response.flightroute.origin.icao_code, "EGLL");
assert.equal(response.response.flightroute.destination.iata_code, "BOS");
assert.equal(response.response.flightroute.airline.icao, "BAW");

const richResponse = buildFlightAwareRouteResponse("AAL873", richScrape);

assert.equal(richResponse.response.flightroute.callsign_iata, "AA873");
assert.equal(richResponse.response.flightroute.origin.name, "Boston Logan Intl");
assert.equal(richResponse.response.flightroute.origin.latitude, 42.3629);
assert.equal(richResponse.response.flightroute.destination.longitude, -80.2901);
assert.equal(richResponse.response.flightroute.airline.name, "American Airlines");
assert.equal(
  richResponse.response.flightroute.airline.icon_url,
  "https://www.flightaware.com/images/airline_logos/180px/AAL.png",
);
