import assert from "node:assert/strict";

import {
  build24HourWindowPairs,
  buildMatchArtifactRows,
  parseCliArgs,
  renderMarkdownReport,
  renderMatchTableMarkdown,
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
    artifactsDir: "",
  },
);

assert.equal(
  parseCliArgs([
    "KBOS",
    "--artifacts-dir=docs/poc/airport-fids/2026-05-14",
  ]).artifactsDir,
  "docs/poc/airport-fids/2026-05-14",
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

const matchRows = buildMatchArtifactRows({
  aircraft: [
    {
      hex: "a43b85",
      flight: "DAL1166",
      r: "N372DA",
      lat: 40.7,
      lon: -73.8,
    },
    {
      hex: "aa8537",
      flight: "N777YJ",
      r: "N777YJ",
      lat: 40.7,
      lon: -73.8,
    },
  ],
  matches: [
    {
      rawAircraftHex: "A43B85",
      rawAircraftRegistration: "N372DA",
      rawCallsign: "DAL1166",
      matchedFlightId: "arrival:dal1166",
      matchedFlightNumber: "1166",
      direction: "arrival",
      matchMethod: "icao24",
      confidence: "high",
      score: 100,
      origin: { icao: "KSAT", iata: "SAT" },
      destination: { icao: "KJFK", iata: "JFK" },
      airline: { icao: "DAL", iata: "DL", name: "Delta Air Lines" },
      source: "aerodatabox-airport-fids",
    },
    {
      rawAircraftHex: "AA8537",
      rawAircraftRegistration: "N777YJ",
      rawCallsign: "N777YJ",
      matchedFlightId: "departure:dal28",
      matchedFlightNumber: "28",
      direction: "departure",
      matchMethod: "route-time-position-score",
      confidence: "low",
      score: 26,
      origin: { icao: "KJFK", iata: "JFK" },
      destination: { icao: "LFMN", iata: "NCE" },
      airline: { icao: "DAL", iata: "DL", name: "Delta Air Lines" },
      source: "aerodatabox-airport-fids",
    },
  ],
  flights: [
    {
      id: "arrival:dal1166",
      callsign: "DAL1166",
      flightNumber: "1166",
      scheduledTimeLocal: "2026-05-14 18:00-04:00",
      aircraft: { modeS: "A43B85", registration: "N372DA" },
      matchKeys: { convertedCallsigns: ["DL1166", "DAL1166"] },
    },
    {
      id: "departure:dal28",
      callsign: "DAL28",
      flightNumber: "28",
      scheduledTimeLocal: "2026-05-14 19:10-04:00",
      aircraft: { modeS: "AB4489", registration: "N825MH" },
      matchKeys: { convertedCallsigns: ["DL28", "DAL28"] },
    },
  ],
});

assert.equal(matchRows[0].rawAircraftHex, "A43B85");
assert.equal(matchRows[0].matchedFlightCallsign, "DAL1166");
assert.equal(matchRows[1].matchedFlightRegistration, "N825MH");
assert.equal(matchRows[1].identifierAgreement, "none");

const matchTable = renderMatchTableMarkdown(matchRows);
assert.match(matchTable, /\| raw callsign \| raw reg \| raw hex \|/);
assert.match(matchTable, /DAL1166/);
assert.match(matchTable, /route-time-position-score/);
