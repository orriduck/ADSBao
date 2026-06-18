import assert from "node:assert/strict";
import {
  normalizeAppVersion,
  resolveAppVersionUpdate,
} from "./appVersionModel";

assert.equal(normalizeAppVersion(" v2.10.0 "), "2.10.0");
assert.equal(normalizeAppVersion("2.10.0"), "2.10.0");
assert.equal(normalizeAppVersion(null), "");

assert.deepEqual(
  resolveAppVersionUpdate({
    currentVersion: "2.10.0",
    latestVersion: "v2.11.0",
  }),
  {
    currentVersion: "2.10.0",
    latestVersion: "2.11.0",
  },
);

assert.equal(
  resolveAppVersionUpdate({
    currentVersion: "v2.10.0",
    latestVersion: "2.10.0",
  }),
  null,
);

assert.equal(
  resolveAppVersionUpdate({
    currentVersion: "2.10.0",
    latestVersion: "",
  }),
  null,
);
