import assert from "node:assert/strict";

import { fetchAircraftPositions } from "./aircraftPositions.mechanism";

const originalFetch = globalThis.fetch;
const urls = [];

globalThis.fetch = async (url) => {
  urls.push(String(url));
  if (String(url).includes("opendata.adsb.fi")) {
    return new Response(
      JSON.stringify({
        now: 1779678000,
        aircraft: [{ hex: "a360b7", flight: "JBU396  ", seen_pos: 5.2 }],
        resultCount: 1,
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  }
  return new Response(JSON.stringify({ now: 1779678000, ac: [] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

try {
  const result = await fetchAircraftPositions({
    latitude: 42.3656,
    longitude: -71.0096,
    distanceNm: 40,
  });

  assert.equal(urls.length > 0, true);
  assert.equal(urls.some((url) => /flightaware/i.test(url)), false);
  assert.equal(urls.some((url) => /lat|point/.test(url)), true);
  assert.equal(
    urls.some((url) => url.includes("opendata.adsb.fi/api/v2/lat")),
    true,
  );
  if (result.source === "adsb.fi") {
    assert.deepEqual((result.payload as unknown as { ac: unknown[] }).ac, [
      {
        hex: "a360b7",
        flight: "JBU396  ",
        seen_pos: 5.2,
        source: "adsb.fi",
        positionQuality: {
          source: "adsb_fi",
          flight_position_source: "adsb",
          kind: "observed",
          isEstimated: false,
          isPredicted: false,
          isInterpolated: false,
          isStale: false,
          sourceLabel: "adsb.fi",
          sourceUpdatedAt: new Date(1779678000 * 1000 - 5200).toISOString(),
          fetchedAt: new Date(1779678000 * 1000).toISOString(),
          ageSeconds: 5,
          confidence: "high",
          notes: undefined,
        },
      },
    ]);
  }
} finally {
  globalThis.fetch = originalFetch;
}

console.log("aircraftPositions.mechanism.test.ts ok");
