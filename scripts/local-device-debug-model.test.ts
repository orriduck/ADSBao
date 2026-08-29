import assert from "node:assert/strict";
import {
  buildThreeOsmDeviceAcceptanceUrl,
  resolveThreeOsmProviderFieldState,
  selectAdsbaoLocalDeviceHost,
} from "./local-device-debug-model";

const selected = selectAdsbaoLocalDeviceHost({
  interfaces: {
    utun4: [{ address: "10.8.0.2", family: "IPv4", internal: false }],
    bridge100: [
      { address: "192.168.64.1", family: "IPv4", internal: false },
    ],
    en1: [{ address: "10.0.0.8", family: 4, internal: false }],
    en0: [
      { address: "fe80::1", family: "IPv6", internal: false },
      { address: "192.168.99.103", family: "IPv4", internal: false },
    ],
  },
});
assert.equal(selected, "192.168.99.103");

assert.equal(
  selectAdsbaoLocalDeviceHost({
    interfaces: {},
    explicitHost: "adsbao-mac.local",
  }),
  "adsbao-mac.local",
);
assert.equal(
  selectAdsbaoLocalDeviceHost({
    interfaces: {},
    explicitHost: "http://unsafe.example/path",
  }),
  null,
);
assert.equal(
  selectAdsbaoLocalDeviceHost({
    interfaces: {},
    explicitHost: "203.0.113.9",
  }),
  null,
);
assert.equal(
  selectAdsbaoLocalDeviceHost({
    interfaces: {},
    explicitHost: "2001:db8::1",
  }),
  null,
);
assert.equal(
  selectAdsbaoLocalDeviceHost({
    interfaces: {
      en0: [{ address: "203.0.113.9", family: "IPv4", internal: false }],
    },
  }),
  null,
);

const providerEnv = {
  VITE_THREE_OSM_RASTER_SOURCE_ID: "licensed-raster",
  VITE_THREE_OSM_RASTER_URL_TEMPLATE: "https://tiles.example/{z}/{x}/{y}.png?k=secret",
  VITE_THREE_OSM_RASTER_ATTRIBUTION: "Example Maps",
  VITE_THREE_OSM_RASTER_ATTRIBUTION_URL: "https://example.test/terms",
};
assert.deepEqual(resolveThreeOsmProviderFieldState(providerEnv), {
  configured: 4,
  total: 4,
  complete: true,
  partial: false,
});
assert.deepEqual(
  resolveThreeOsmProviderFieldState({
    VITE_THREE_OSM_RASTER_SOURCE_ID: "partial",
  }),
  { configured: 1, total: 4, complete: false, partial: true },
);

const acceptanceUrl = buildThreeOsmDeviceAcceptanceUrl({
  origin: "http://192.168.99.103:3000",
  configuredTiles: true,
});
assert.equal(
  acceptanceUrl,
  "http://192.168.99.103:3000/airport/KBOS?threeOsmPoc=1&threeOsmDebug=1&threeOsmSoak=1&threeOsmAcceptance=1&threeOsmTiles=configured&locale=en",
);
assert.equal(acceptanceUrl.includes("secret"), false);
assert.equal(acceptanceUrl.includes("tiles.example"), false);

console.log("local-device-debug-model.test.ts ok");
