import assert from "node:assert/strict";

import {
  buildFlightAwareRouteResponse,
  extractFlightAwareTargeting,
  normalizeRouteCallsign,
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

assert.deepEqual(extractFlightAwareTargeting(html), {
  origin: { icao: "EGLL", iata: "LHR" },
  destination: { icao: "KBOS", iata: "BOS" },
});

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
