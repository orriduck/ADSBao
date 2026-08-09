import assert from "node:assert/strict";
import { buildMapSourceStatusDisplay, formatAircraftFeedProvider } from "./sourceDisplayModel";

assert.deepEqual(buildMapSourceStatusDisplay({ feedSource: "adsb.fi" }), {
  feedSource: "adsb.fi",
  cachedLabel: "",
});
assert.equal(formatAircraftFeedProvider("fr24"), "Flightradar24");

assert.deepEqual(
  buildMapSourceStatusDisplay({
    feedSource: "airplanes.live",
    feedStatus: "infer",
    cachedLabel: "Cached",
  }),
  { feedSource: "airplanes.live", cachedLabel: "Cached" },
);

assert.deepEqual(buildMapSourceStatusDisplay({ feedSource: "internal-fallback" }), {
  feedSource: "",
  cachedLabel: "",
});

console.log("sourceDisplayModel.test.ts ok");
