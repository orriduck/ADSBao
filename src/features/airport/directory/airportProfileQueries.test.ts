import assert from "node:assert/strict";
import {
  airportProfileCode,
  airportProfileQueryKeys,
  mergeAirportProfile,
  normalizeAirportProfileIcao,
  normalizeAirportProfileLocale,
  resolveAirportProfileCoordinates,
  resolveAirportProfileSeed,
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

const navigationSeed = { icao: "KOWD", name: "Norwood Memorial", lat: 42.19, lon: -71.17 };
const localSeed = { icao: "KBOS", name: "Boston Logan" };
assert.equal(
  resolveAirportProfileSeed({
    icao: "KOWD",
    navigationAirport: navigationSeed,
    localAirport: localSeed,
  }),
  navigationSeed,
);
assert.equal(
  resolveAirportProfileSeed({
    icao: "KBOS",
    navigationAirport: navigationSeed,
    localAirport: localSeed,
  }),
  localSeed,
);
assert.equal(
  resolveAirportProfileSeed({
    icao: "KJFK",
    navigationAirport: navigationSeed,
    localAirport: localSeed,
  }),
  null,
);

assert.deepEqual(
  resolveAirportProfileCoordinates({
    detail: { icao: "KCLT", lat: 35.21318694, lon: -80.95137916 },
    seedAirport: { icao: "KCLT", lat: 35.2140007, lon: -80.94309998 },
  }),
  { lat: 35.2140007, lon: -80.94309998 },
  "small same-airport coordinate drift should keep the already-subscribed seed",
);
assert.deepEqual(
  resolveAirportProfileCoordinates({
    detail: { icao: "KCLT", lat: 35.21318694, lon: -80.95137916 },
    seedAirport: { icao: "KCLT", lat: 36, lon: -81 },
  }),
  { lat: 35.21318694, lon: -80.95137916 },
  "materially different seed coordinates should yield to resolved detail",
);
assert.deepEqual(
  resolveAirportProfileCoordinates({
    detail: { icao: "KCLT", lat: 35.21318694, lon: -80.95137916 },
    seedAirport: { icao: "KPHL", lat: 39.8719, lon: -75.2411 },
  }),
  { lat: 35.21318694, lon: -80.95137916 },
  "a seed for another airport must never influence the resolved profile",
);

console.log("airportProfileQueries.test.ts: ok");
