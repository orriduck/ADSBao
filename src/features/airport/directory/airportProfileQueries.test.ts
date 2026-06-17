import assert from "node:assert/strict";
import {
  airportProfileCode,
  airportProfileQueryKeys,
  mergeAirportProfile,
  normalizeAirportProfileIcao,
  normalizeAirportProfileLocale,
} from "./airportProfileQueries";

assert.equal(normalizeAirportProfileIcao(" kbos "), "KBOS");
assert.equal(normalizeAirportProfileIcao("bad-code"), "");
assert.equal(normalizeAirportProfileLocale(" zh-CN "), "zh-CN");

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
]);

assert.equal(airportProfileCode({ ident: "egll" }), "EGLL");
assert.equal(airportProfileCode({ code: "zbaa", icao: "" }), "ZBAA");

const merged = mergeAirportProfile({
  detail: {
    icao: "KBOS",
    name: "Boston Logan",
    nearbyAirports: [],
    surfaceMap: null,
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

console.log("airportProfileQueries.test.ts: ok");
