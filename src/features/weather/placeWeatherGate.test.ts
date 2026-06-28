import assert from "node:assert/strict";
import {
  buildPlaceKey,
  nextPlaceCoordState,
  type PlaceCoordGateState,
} from "./placeWeatherGate";

// buildPlaceKey: stable identity, coarser than coordinates.
assert.equal(buildPlaceKey(null), "");
assert.equal(
  buildPlaceKey({ countryCode: "US", state: "Massachusetts", city: "Boston" }),
  "US|Massachusetts|Boston",
);
// Whitespace-only / missing fields are dropped, not rendered as empty segments.
assert.equal(
  buildPlaceKey({ countryCode: "US", state: "  ", county: "Suffolk", city: "" }),
  "US|Suffolk",
);

const boston = { lat: 42.3601, lon: -71.0589 };
const cambridge = { lat: 42.3736, lon: -71.1097 };
const bostonKey = "US|Massachusetts|Boston";
const cambridgeKey = "US|Massachusetts|Cambridge";

// First fix seeds at the live position even before the place name resolves.
{
  const seeded = nextPlaceCoordState(null, boston, "");
  assert.deepEqual(seeded, { placeKey: "", lat: boston.lat, lon: boston.lon });
}

// Seeded-before-resolve: micro-updates with no place yet never move the snapshot.
{
  const seeded: PlaceCoordGateState = { placeKey: "", ...boston };
  const after = nextPlaceCoordState(seeded, { lat: 42.3605, lon: -71.0591 }, "");
  assert.equal(after, seeded);
}

// The first resolved name adopts the key but keeps the original snapshot coords.
{
  const seeded: PlaceCoordGateState = { placeKey: "", ...boston };
  const after = nextPlaceCoordState(seeded, cambridge, bostonKey);
  assert.deepEqual(after, { placeKey: bostonKey, lat: boston.lat, lon: boston.lon });
}

// Same place, new live coords → snapshot stays frozen (no weather refetch).
{
  const settled: PlaceCoordGateState = { placeKey: bostonKey, ...boston };
  const after = nextPlaceCoordState(settled, { lat: 42.362, lon: -71.06 }, bostonKey);
  assert.equal(after, settled);
}

// Crossing into a new place advances the snapshot to the current position.
{
  const settled: PlaceCoordGateState = { placeKey: bostonKey, ...boston };
  const after = nextPlaceCoordState(settled, cambridge, cambridgeKey);
  assert.deepEqual(after, {
    placeKey: cambridgeKey,
    lat: cambridge.lat,
    lon: cambridge.lon,
  });
}

// A transient empty key (geocode hiccup) does not move a settled snapshot.
{
  const settled: PlaceCoordGateState = { placeKey: bostonKey, ...boston };
  const after = nextPlaceCoordState(settled, cambridge, "");
  assert.equal(after, settled);
}

console.log("placeWeatherGate.test.ts passed");
