import assert from "node:assert/strict";

import { fetchAircraftPositions } from "./aircraftPositions.mechanism.js";

const originalFetch = globalThis.fetch;
const urls = [];

globalThis.fetch = async (url) => {
  urls.push(String(url));
  return new Response(JSON.stringify({ now: 1779678000, ac: [] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

try {
  await fetchAircraftPositions({
    latitude: 42.3656,
    longitude: -71.0096,
    distanceNm: 40,
  });

  assert.equal(urls.length > 0, true);
  assert.equal(urls.some((url) => /flightaware/i.test(url)), false);
  assert.equal(urls.some((url) => /lat|point/.test(url)), true);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("aircraftPositions.mechanism.test.js ok");
