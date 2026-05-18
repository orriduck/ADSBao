import assert from "node:assert/strict";

import {
  COMMUNITY_FEEDBACK_DISPLAY_SUFFIX,
  COMMUNITY_FEEDBACK_REASONS,
  COMMUNITY_FEEDBACK_SOURCE,
  COMMUNITY_FEEDBACK_TTL_MS,
  buildCommunityFeedbackRoute,
  computeFeedbackExpiry,
  isCommunityFeedbackRoute,
} from "./communityFeedbackRouteModel.js";

assert.equal(COMMUNITY_FEEDBACK_TTL_MS, 12 * 60 * 60 * 1000);
assert.equal(COMMUNITY_FEEDBACK_DISPLAY_SUFFIX, "*");
assert.equal(COMMUNITY_FEEDBACK_SOURCE, "community-feedback");
assert.deepEqual(COMMUNITY_FEEDBACK_REASONS, {
  missingRoute: "missing_route",
  correction: "correction",
});

{
  const route = buildCommunityFeedbackRoute({
    callsign: "aal1234",
    origin: {
      icao: "kjfk",
      iata: "jfk",
      name: "John F Kennedy International Airport",
      municipality: "New York",
      country: "us",
      lat: 40.6413,
      lon: -73.7781,
    },
    destination: {
      icao: "kbos",
      iata: "bos",
      name: "Boston Logan International Airport",
      municipality: "Boston",
      country: "us",
      lat: 42.3656,
      lon: -71.0096,
    },
    createdAt: "2026-05-17T00:00:00.000Z",
    expiresAt: "2026-05-17T12:00:00.000Z",
    feedbackReason: COMMUNITY_FEEDBACK_REASONS.correction,
  });

  assert.equal(route.callsign, "AAL1234");
  assert.equal(route.origin.icao, "KJFK");
  assert.equal(route.origin.iata, "JFK");
  assert.equal(route.origin.country, "US");
  assert.equal(route.destination.icao, "KBOS");
  assert.equal(route.route.icao, "KJFK-KBOS");
  assert.equal(route.route.iata, "JFK-BOS");
  assert.equal(route.source, "community-feedback");
  assert.equal(route.confidence, "user-supplied");
  assert.equal(route.temporary, true);
  assert.equal(route.displaySuffix, "*");
  assert.equal(route.feedbackReason, "correction");
  assert.equal(route.expiresAt, "2026-05-17T12:00:00.000Z");
  assert.equal(isCommunityFeedbackRoute(route), true);
}

// Invalid inputs short-circuit so a half-formed community route doesn't
// poison the in-memory route cache for a callsign that's otherwise empty.
assert.equal(
  buildCommunityFeedbackRoute({
    callsign: "bad-call",
    origin: { icao: "KJFK", lat: 0, lon: 0 },
    destination: { icao: "KBOS", lat: 0, lon: 0 },
  }),
  null,
);
assert.equal(
  buildCommunityFeedbackRoute({
    callsign: "AAL1234",
    origin: { icao: "??", lat: 0, lon: 0 },
    destination: { icao: "KBOS" },
  }),
  null,
);
// Self-loop (origin = destination) is meaningless as a route.
assert.equal(
  buildCommunityFeedbackRoute({
    callsign: "AAL1234",
    origin: { icao: "KJFK" },
    destination: { icao: "KJFK" },
  }),
  null,
);

assert.equal(isCommunityFeedbackRoute({ source: "adsbdb" }), false);
assert.equal(isCommunityFeedbackRoute(null), false);

{
  const { createdAt, expiresAt } = computeFeedbackExpiry(
    Date.parse("2026-05-17T00:00:00.000Z"),
  );
  assert.equal(createdAt, "2026-05-17T00:00:00.000Z");
  assert.equal(expiresAt, "2026-05-17T12:00:00.000Z");
}
