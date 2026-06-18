import assert from "node:assert/strict";
import {
  airportProfileCode,
  airportProfileQueryKeys,
  mergeAirportProfile,
  mergeAirportSurfaceMaps,
  normalizeAirportProfileIcao,
  normalizeAirportProfileLocale,
  normalizeAirportSurfaceScope,
} from "./airportProfileQueries";

assert.equal(normalizeAirportProfileIcao(" kbos "), "KBOS");
assert.equal(normalizeAirportProfileIcao("bad-code"), "");
assert.equal(normalizeAirportProfileLocale(" zh-CN "), "zh-CN");
assert.equal(normalizeAirportSurfaceScope("structures"), "structures");
assert.equal(normalizeAirportSurfaceScope("all"), "pavement");

assert.deepEqual(airportProfileQueryKeys.detail("kbos", "zh-CN"), [
  "airport-profile",
  "detail",
  "KBOS",
  "zh-CN",
]);
assert.deepEqual(airportProfileQueryKeys.context(" zspd "), [
  "airport-profile",
  "context",
  "ZSPD",
]);
assert.deepEqual(airportProfileQueryKeys.surface("kjfk"), [
  "airport-profile",
  "surface",
  "KJFK",
  "pavement",
]);
assert.deepEqual(airportProfileQueryKeys.surface("kjfk", "structures"), [
  "airport-profile",
  "surface",
  "KJFK",
  "structures",
]);

assert.equal(airportProfileCode({ ident: "egll" }), "EGLL");
assert.equal(airportProfileCode({ code: "zbaa", icao: "" }), "ZBAA");

const merged = mergeAirportProfile({
  detail: {
    icao: "KBOS",
    name: "Boston Logan",
    nearbyAirports: [],
  },
  context: {
    nearbyAirports: [{ icao: "KOWD" }],
    airspaces: [{ id: "bos-b" }],
  },
  surfaceMap: { airport: "KBOS", features: [] },
});

assert.equal(merged.icao, "KBOS");
assert.deepEqual(merged.nearbyAirports, [{ icao: "KOWD" }]);
assert.deepEqual(merged.airspaces, [{ id: "bos-b" }]);
assert.deepEqual(merged.surfaceMap, { airport: "KBOS", features: [] });
assert.equal(mergeAirportProfile({ detail: null }), null);

const mergedSurfaceMap = mergeAirportSurfaceMaps(
  {
    airport: "KJFK",
    source: "OpenStreetMap",
    counts: { taxiway: 1 },
    features: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "LineString", coordinates: [] },
          properties: { id: "taxiway-a", kind: "taxiway" },
        },
      ],
    },
  },
  {
    airport: "KJFK",
    source: "OpenStreetMap",
    counts: { building: 1 },
    features: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [] },
          properties: { id: "building-a", kind: "building" },
        },
      ],
    },
  },
);
assert.equal(mergedSurfaceMap.airport, "KJFK");
assert.deepEqual(mergedSurfaceMap.counts, { taxiway: 1, building: 1 });
assert.deepEqual(
  mergedSurfaceMap.features.features.map((feature) => feature.properties.kind),
  ["building", "taxiway"],
);
assert.equal(mergeAirportSurfaceMaps(null, undefined), null);

console.log("airportProfileQueries.test.ts: ok");
