import assert from "node:assert/strict";

import {
  buildRouteFeedbackInsertSpec,
  normalizeRouteFeedbackInput,
} from "./routeFeedbackHandlerModel.js";

// Happy path: a missing-route submission produces a normalized input value
// that the handler can hand straight to the airport-resolution step.
{
  const result = normalizeRouteFeedbackInput({
    callsign: "aal 1234",
    targetAirportIcao: "kbos",
    targetAirportIata: "bos",
    originIcao: "kjfk",
    destinationIcao: "kbos",
    aircraftHex: "A1B2C3",
    aircraftType: "a321",
    feedbackReason: "missing_route",
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    normalizedCallsign: "AAL1234",
    originIcao: "KJFK",
    destinationIcao: "KBOS",
    targetAirportIcao: "KBOS",
    targetAirportIata: "BOS",
    feedbackReason: "missing_route",
    aircraftHex: "a1b2c3",
    aircraftType: "A321",
    priorRoute: null,
  });
}

// A "correction" feedback carries the prior adsbdb payload so we can audit
// what the user disagreed with later. Unknown feedback reasons fall back
// to "missing_route" instead of 400'ing, since the data is still useful.
{
  const result = normalizeRouteFeedbackInput({
    callsign: "AAL1234",
    targetAirportIcao: "KBOS",
    targetAirportIata: "BOS",
    originIcao: "KJFK",
    destinationIcao: "KBOS",
    feedbackReason: "correction",
    priorRoute: {
      origin: { icao: "KORD" },
      destination: { icao: "KBOS" },
      source: "adsbdb",
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.feedbackReason, "correction");
  assert.deepEqual(result.value.priorRoute, {
    origin: { icao: "KORD" },
    destination: { icao: "KBOS" },
    source: "adsbdb",
  });

  const unknownReason = normalizeRouteFeedbackInput({
    callsign: "AAL1234",
    originIcao: "KJFK",
    destinationIcao: "KBOS",
    feedbackReason: "nonsense",
  });
  assert.equal(unknownReason.value.feedbackReason, "missing_route");
}

// Bad bodies short-circuit with explicit messages so the handler can return
// 400 without rummaging through stack traces.
assert.equal(
  normalizeRouteFeedbackInput(null).error,
  "Invalid request body",
);
assert.equal(
  normalizeRouteFeedbackInput({ callsign: "bad-call" }).error,
  "Invalid callsign",
);
assert.equal(
  normalizeRouteFeedbackInput({
    callsign: "AAL1234",
    originIcao: "??",
    destinationIcao: "KBOS",
  }).error,
  "Invalid origin or destination ICAO",
);
assert.equal(
  normalizeRouteFeedbackInput({
    callsign: "AAL1234",
    originIcao: "KBOS",
    destinationIcao: "KBOS",
  }).error,
  "Origin and destination must differ",
);

// Build phase: the insert spec carries both the row we will persist and
// the route payload the UI will splice into its in-memory cache. They must
// share the same cache key so a subsequent /api/proxy lookup finds the
// override under the same namespace.
{
  const input = {
    normalizedCallsign: "AAL1234",
    originIcao: "KJFK",
    destinationIcao: "KBOS",
    targetAirportIcao: "KBOS",
    targetAirportIata: "BOS",
    feedbackReason: "missing_route",
    aircraftHex: "a1b2c3",
    aircraftType: "A321",
    priorRoute: null,
  };
  const originAirport = {
    icao: "KJFK",
    iata: "JFK",
    name: "John F Kennedy International Airport",
    city: "New York",
    country: "US",
    lat: 40.6413,
    lon: -73.7781,
  };
  const destinationAirport = {
    icao: "KBOS",
    iata: "BOS",
    name: "Boston Logan International Airport",
    city: "Boston",
    country: "US",
    lat: 42.3656,
    lon: -71.0096,
  };

  const spec = buildRouteFeedbackInsertSpec({
    input,
    originAirport,
    destinationAirport,
    now: Date.parse("2026-05-17T00:00:00.000Z"),
  });

  assert.equal(spec.cacheKey, "AAL1234|KBOS|BOS");
  assert.equal(spec.route.callsign, "AAL1234");
  assert.equal(spec.route.origin.icao, "KJFK");
  assert.equal(spec.route.destination.icao, "KBOS");
  assert.equal(spec.route.temporary, true);
  assert.equal(spec.route.displaySuffix, "*");
  assert.equal(spec.route.expiresAt, "2026-05-17T12:00:00.000Z");
  assert.equal(spec.record.cacheKey, spec.cacheKey);
  assert.equal(spec.record.originIcao, "KJFK");
  assert.equal(spec.record.destinationIcao, "KBOS");
  assert.equal(spec.record.feedbackReason, "missing_route");
  assert.equal(spec.record.targetAirportIcao, "KBOS");
  assert.equal(spec.record.targetAirportIata, "BOS");
  assert.equal(spec.record.aircraftHex, "a1b2c3");
  assert.equal(spec.record.aircraftType, "A321");
  assert.equal(spec.record.createdAt, "2026-05-17T00:00:00.000Z");
  assert.equal(spec.record.expiresAt, "2026-05-17T12:00:00.000Z");
  assert.equal(spec.record.routePayload, spec.route);
  assert.equal(spec.record.priorRoutePayload, null);
}

// Missing prerequisites surface as null so the handler can return 502/422
// rather than persisting a degenerate row that the lookup query would
// happily echo back later.
assert.equal(
  buildRouteFeedbackInsertSpec({
    input: null,
    originAirport: { icao: "KJFK", lat: 40, lon: -73 },
    destinationAirport: { icao: "KBOS", lat: 42, lon: -71 },
  }),
  null,
);
assert.equal(
  buildRouteFeedbackInsertSpec({
    input: { normalizedCallsign: "AAL1234" },
    originAirport: null,
    destinationAirport: { icao: "KBOS", lat: 42, lon: -71 },
  }),
  null,
);
