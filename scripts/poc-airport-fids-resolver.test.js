import assert from "node:assert/strict";

import {
  build24HourWindowPairs,
  parseCliArgs,
  renderMarkdownReport,
} from "./poc-airport-fids-resolver.mjs";

assert.deepEqual(
  parseCliArgs([
    "KBOS",
    "KJFK",
    "--format=json",
    "--range-nm=40",
    "--future-hours=24",
  ]),
  {
    airports: ["KBOS", "KJFK"],
    format: "json",
    rangeNm: 40,
    futureHours: 24,
    currentLookbackMinutes: 180,
    currentWindowMinutes: 720,
  },
);

assert.deepEqual(
  build24HourWindowPairs("2026-05-14T00:00", {
    totalHours: 24,
    maxWindowHours: 12,
  }),
  [
    {
      fromLocal: "2026-05-14T00:00",
      toLocal: "2026-05-14T12:00",
    },
    {
      fromLocal: "2026-05-14T12:00",
      toLocal: "2026-05-15T00:00",
    },
  ],
);

const markdown = renderMarkdownReport({
  generatedAt: "2026-05-14T20:00:00Z",
  airports: [
    {
      airport: { icao: "KBOS", iata: "BOS" },
      health: {
        flightSchedulesStatus: "OK",
        liveUpdatesStatus: "OK",
        adsbUpdatesStatus: "OKPartial",
      },
      liveAircraftCount: 43,
      currentPath: {
        lookupCount: 18,
        vrsCalls: 18,
        aerodataboxFallbackCalls: 9,
        matchedRoutes: 15,
        multiLegRoutes: 2,
        missingTargetRoutes: 4,
      },
      fidsPath: {
        calls: 4,
        currentWindow: { arrivals: 88, departures: 76 },
        future24h: { windowCount: 2, totalFlights: 612, duplicates: 41 },
        paginationRisk: "split-window-recommended",
        matched: { high: 12, medium: 9, low: 3, unmatched: 19 },
      },
      latency: {
        currentAvgMs: 720,
        currentP95Ms: 1600,
        fidsAvgMs: 510,
        fidsP95Ms: 770,
      },
      errors: {
        current: { status429: 0, status204: 2, status404: 1, status5xx: 0 },
        fids: { status429: 1, status204: 0, status404: 0, status5xx: 0 },
      },
      verdict: {
        callReductionPct: 77.8,
        matchQuality: "promising",
        recommended: true,
      },
    },
  ],
});

assert.match(markdown, /## KBOS \/ BOS/);
assert.match(markdown, /\| airport \| live aircraft \| current route calls \|/);
assert.match(markdown, /future 24h/);
assert.match(markdown, /Go\/No-Go: go/);
