import assert from "node:assert/strict";
import {
  isAdsbaoOfflineNavigationPath,
  isAdsbaoNetworkOnlyPath,
  shouldPrecacheViteChunk,
} from "./pwaCachePolicy";

assert.equal(isAdsbaoOfflineNavigationPath("/"), true);
assert.equal(isAdsbaoOfflineNavigationPath("/about"), true);
assert.equal(isAdsbaoOfflineNavigationPath("/mechanism"), true);
assert.equal(isAdsbaoOfflineNavigationPath("/changelog"), true);
assert.equal(isAdsbaoOfflineNavigationPath("/airport/KBOS"), false);
assert.equal(isAdsbaoOfflineNavigationPath("/aircraft/DAL123"), false);
assert.equal(isAdsbaoOfflineNavigationPath("/here"), false);

assert.equal(isAdsbaoNetworkOnlyPath("/api/proxy/aircraft/positions/42/-71/40"), true);
assert.equal(isAdsbaoNetworkOnlyPath("/api/proxy/metar/KBOS"), true);
assert.equal(isAdsbaoNetworkOnlyPath("/api/realtime/auth"), true);
assert.equal(isAdsbaoNetworkOnlyPath("/ws"), true);
assert.equal(isAdsbaoNetworkOnlyPath("/runtime-env.js"), true);
assert.equal(isAdsbaoNetworkOnlyPath("/adsbao-version.json"), true);
assert.equal(isAdsbaoNetworkOnlyPath("/brand/adsbao-aircraft-brand-loop.mp4"), false);

assert.equal(
  shouldPrecacheViteChunk({
    isEntry: false,
    moduleIds: ["/repo/src/components/changelog/ChangelogPanel.tsx"],
  }),
  true,
);
assert.equal(
  shouldPrecacheViteChunk({
    isEntry: false,
    moduleIds: ["/repo/src/components/map/AirportMap.tsx"],
  }),
  false,
);
