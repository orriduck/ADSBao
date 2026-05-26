import assert from "node:assert/strict";

import {
  FLIGHTAWARE_FALLBACK_CACHE_TTL_MS,
  buildFlightAwareFallbackUrl,
  clearFlightAwareFallbackCache,
  getFlightAwareFallbackByCallsign,
  parseFlightAwareFallbackPage,
} from "./flightAwareFallbackProvider.js";

const fetchedAt = "2026-05-25T03:00:00.000Z";

const activeHtml = `
  <title>AA100 (AAL100) American Airlines Flight Tracking and History - FlightAware</title>
  <meta name="origin" content="KJFK" />
  <meta name="destination" content="EGLL" />
  <script>
    var trackpollBootstrap = {"version":"2.24","summary":false,"flights":{
      "AAL100-1":{
        "ident":"AAL100",
        "displayIdent":"AAL100",
        "flightStatus":"enroute",
        "historical":false,
        "coord":[-47.0000,47.3667],
        "altitude":380,
        "groundspeed":500,
        "heading":77,
        "timestamp":1779672066,
        "origin":{"icao":"KJFK","iata":"JFK","friendlyName":"John F Kennedy Intl","coord":[-73.7789,40.6398]},
        "destination":{"icao":"EGLL","iata":"LHR","friendlyName":"London Heathrow","coord":[-0.4614,51.4775]},
        "flightPlan":{"speed":488,"altitude":380,"route":"NATV DOGAL"},
        "track":[
          {"timestamp":1779672066,"coord":[-47.0000,47.3667],"alt":380,"gs":500,"type":"","isolated":false},
          {"timestamp":1779672187,"coord":[-46.5833,47.4167],"alt":null,"gs":null,"type":"TP","isolated":false}
        ],
        "updateType":"estimated"
      }
    }};
  </script>
`;

const metadataOnlyHtml = `
  <title>BA212 (BAW212) British Airways Flight Tracking and History - FlightAware</title>
  <meta name="origin" content="KBOS" />
  <meta name="destination" content="EGLL" />
  <script>
    var trackpollBootstrap = {"version":"2.24","flights":{
      "BAW212-1":{
        "ident":"BAW212",
        "displayIdent":"BAW212",
        "flightStatus":"scheduled",
        "coord":null,
        "altitude":null,
        "groundspeed":null,
        "heading":null,
        "timestamp":null,
        "origin":{"icao":"KBOS","iata":"BOS","friendlyName":"Boston Logan Intl","coord":[-71.0064,42.3629]},
        "destination":{"icao":"EGLL","iata":"LHR","friendlyName":"London Heathrow","coord":[-0.4614,51.4775]},
        "flightPlan":{"speed":464,"altitude":370,"route":"CELTK7 NATV"},
        "track":null
      }
    }};
  </script>
	`;

const arrivedHtml = `
  <title>BA242 (BAW242) British Airways Flight Tracking and History - FlightAware</title>
  <meta name="origin" content="MMMX" />
  <meta name="destination" content="EGLL" />
  <script>
    var trackpollBootstrap = {"version":"2.24","flights":{
      "BAW242-1":{
        "ident":"BAW242",
        "displayIdent":"BAW242",
        "flightStatus":"arrived",
        "historical":false,
        "coord":null,
        "altitude":null,
        "groundspeed":null,
        "heading":null,
        "timestamp":1779721705,
        "landingTimes":{"actual":1779721260},
        "gateArrivalTimes":{"actual":1779721680},
        "origin":{"icao":"MMMX","iata":"MEX","friendlyName":"Mexico City Intl","coord":[-99.0721,19.4363]},
        "destination":{"icao":"EGLL","iata":"LHR","friendlyName":"London Heathrow","coord":[-0.4614,51.4775]},
        "flightPlan":{"speed":488,"altitude":410,"route":"NATV DOGAL"},
        "track":[
          {"timestamp":1779721196,"coord":[-0.5086,51.4774],"alt":0,"gs":147,"type":"","isolated":false},
          {"timestamp":1779721212,"coord":[-0.4884,51.4775],"alt":0,"gs":153,"type":"","isolated":false}
        ],
        "updateType":""
      }
    }};
  </script>
`;

assert.equal(
  buildFlightAwareFallbackUrl(" aal 100 "),
  "https://www.flightaware.com/live/flight/AAL100",
);
assert.equal(buildFlightAwareFallbackUrl("bad-call"), "");
assert.equal(FLIGHTAWARE_FALLBACK_CACHE_TTL_MS, 60_000);

{
  const result = parseFlightAwareFallbackPage({
    callsign: "AAL100",
    html: activeHtml,
    fetchedAt,
  });

  assert.equal(result.ok, true);
  assert.equal(result.hasPosition, true);
  assert.equal(result.position.lat, 47.3667);
  assert.equal(result.position.lon, -47);
  assert.equal(result.position.altitudeFt, 38000);
  assert.equal(result.position.groundSpeedKt, 500);
  assert.equal(result.position.trackDeg, 77);
  assert.equal(result.position.origin, "KJFK");
  assert.equal(result.position.destination, "EGLL");
  assert.equal(result.position.route, "NATV DOGAL");
  assert.equal(result.position.quality.source, "flightaware");
  assert.equal(result.position.quality.kind, "estimated");
  assert.equal(result.position.quality.isEstimated, true);
  assert.equal(result.position.quality.sourceUpdatedAt, "2026-05-25T01:21:06.000Z");
  assert.equal("raw" in result, false);
}

{
  const result = parseFlightAwareFallbackPage({
    callsign: "BAW212",
    html: metadataOnlyHtml,
    fetchedAt,
  });

  assert.equal(result.ok, true);
  assert.equal(result.hasPosition, false);
  assert.equal(result.metadata.origin, "KBOS");
  assert.equal(result.metadata.destination, "EGLL");
  assert.equal(result.metadata.route, "CELTK7 NATV");
  assert.equal(result.metadata.altitudeFt, 37000);
  assert.equal(result.metadata.groundSpeedKt, 464);
  assert.equal("raw" in result, false);
}

{
  const result = parseFlightAwareFallbackPage({
    callsign: "BAW242",
    html: arrivedHtml,
    fetchedAt,
  });

  assert.equal(result.ok, true);
  assert.equal(result.hasPosition, true);
  assert.equal(result.position.altitudeFt, 0);
  assert.equal(result.position.status, "arrived");
  assert.equal(result.position.terminal, true);
  assert.equal(result.position.quality.status, "arrived");
  assert.equal(result.position.quality.terminal, true);
  assert.equal(result.position.quality.sourceUpdatedAt, "2026-05-25T15:00:12.000Z");
}

{
  const result = parseFlightAwareFallbackPage({
    callsign: "AAL100",
    html: "<html>not-json</html>",
    fetchedAt,
  });
  assert.equal(result.ok, false);
  assert.equal(result.errorType, "parse_failed");
}

{
  clearFlightAwareFallbackCache();
  let fetchCalls = 0;
  const fetchImpl = async () => {
    fetchCalls += 1;
    return new Response(activeHtml, { status: 200 });
  };
  const env = { FLIGHTAWARE_FALLBACK_ENABLED: "true" };
  const first = await getFlightAwareFallbackByCallsign("AAL100", {
    env,
    fetchImpl,
    now: () => Date.parse(fetchedAt),
  });
  const second = await getFlightAwareFallbackByCallsign("AAL100", {
    env,
    fetchImpl,
    now: () => Date.parse(fetchedAt) + 30_000,
  });
  const third = await getFlightAwareFallbackByCallsign("AAL100", {
    env,
    fetchImpl,
    now: () => Date.parse(fetchedAt) + 59_000,
  });
  const fourth = await getFlightAwareFallbackByCallsign("AAL100", {
    env,
    fetchImpl,
    now: () => Date.parse(fetchedAt) + 61_000,
  });

  assert.equal(fetchCalls, 2);
  assert.equal(first.hasPosition, true);
  assert.equal(second.hasPosition, true);
  assert.equal(third.hasPosition, true);
  assert.equal(fourth.hasPosition, true);
}

{
  clearFlightAwareFallbackCache();
  let fetchCalls = 0;
  const enabledByDefault = await getFlightAwareFallbackByCallsign("AAL100", {
    env: {},
    fetchImpl: async () => {
      fetchCalls += 1;
      return new Response(activeHtml, { status: 200 });
    },
    now: () => Date.parse(fetchedAt),
  });

  assert.equal(enabledByDefault.ok, true);
  assert.equal(enabledByDefault.hasPosition, true);
  assert.equal(fetchCalls, 1);
}

{
  clearFlightAwareFallbackCache();
  let fetchCalls = 0;
  const disabled = await getFlightAwareFallbackByCallsign("AAL100", {
    env: { FLIGHTAWARE_FALLBACK_ENABLED: "false" },
    fetchImpl: async () => {
      fetchCalls += 1;
      return new Response(activeHtml, { status: 200 });
    },
    now: () => Date.parse(fetchedAt),
  });

  assert.equal(disabled.ok, false);
  assert.equal(disabled.errorType, "feature_disabled");
  assert.equal(fetchCalls, 0);
}

{
  clearFlightAwareFallbackCache();
  const failed = await getFlightAwareFallbackByCallsign("AAL100", {
    env: { FLIGHTAWARE_FALLBACK_ENABLED: "true" },
    fetchImpl: async () => {
      throw new DOMException("signal timed out", "TimeoutError");
    },
    now: () => Date.parse(fetchedAt),
  });

  assert.equal(failed.ok, false);
  assert.equal(failed.errorType, "timeout");
}

{
  clearFlightAwareFallbackCache();
  const failed = await getFlightAwareFallbackByCallsign("AAL100", {
    env: { FLIGHTAWARE_FALLBACK_ENABLED: "true" },
    fetchImpl: async () => {
      throw new Error("socket closed");
    },
    now: () => Date.parse(fetchedAt),
  });

  assert.equal(failed.ok, false);
  assert.equal(failed.errorType, "network_failed");
}

{
  clearFlightAwareFallbackCache();
  let fetchCalls = 0;
  const first = await getFlightAwareFallbackByCallsign("AAL100", {
    env: { FLIGHTAWARE_FALLBACK_ENABLED: "true" },
    fetchImpl: async () => {
      fetchCalls += 1;
      return new Response("payment required", { status: 402 });
    },
    now: () => Date.parse(fetchedAt),
  });
  const second = await getFlightAwareFallbackByCallsign("AAL100", {
    env: { FLIGHTAWARE_FALLBACK_ENABLED: "true" },
    fetchImpl: async () => {
      fetchCalls += 1;
      return new Response("payment required", { status: 402 });
    },
    now: () => Date.parse(fetchedAt) + 30_000,
  });

  assert.equal(first.ok, false);
  assert.equal(first.errorType, "payment_required");
  assert.equal(first.upstreamStatus, 402);
  assert.equal(first.message, "HTTP 402");
  assert.equal(second.errorType, "payment_required");
  assert.equal(fetchCalls, 1);
}

console.log("flightAwareFallbackProvider.test.js ok");
