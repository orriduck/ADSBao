import { performance } from "node:perf_hooks";
import process from "node:process";

import { AIRCRAFT_TRAFFIC_CONFIG } from "../src/config/aviation.js";
import { AIRPORT_FALLBACKS, COORDS } from "../src/data/airportFallbacks.js";
import { getLookupCallsigns } from "../src/features/flight-routes/flightRouteLookupModel.js";
import {
  AERODATABOX_RAPIDAPI_HOST,
  buildAerodataboxFlightRouteResponse,
  buildAerodataboxFlightUrl,
  reserveAerodataboxRequestSlot,
  resolveAerodataboxDateLocal,
  shouldSuppressVrsRouteAfterAerodataboxStatus,
} from "../src/services/aviation/aerodataboxRouteProxyModel.js";
import {
  buildAerodataboxAirportFeedsHealthUrl,
  buildAerodataboxAirportFidsRelativeUrl,
  buildAerodataboxAirportFidsWindowUrl,
  flattenAirportFidsResponse,
  normalizeAirportFidsFeedCoverage,
} from "../src/services/aviation/airportFidsProxyModel.js";
import { matchAirportFidsAircraftList } from "../src/services/aviation/airportFidsMatcher.js";
import {
  buildVrsRouteResponse,
  buildVrsRouteUrl,
  shouldUseAerodataboxFallback,
  VRS_ROUTE_USER_AGENT,
} from "../src/services/aviation/vrsRouteProxyModel.js";
import { readResponseJson } from "../src/services/apiProxySecurity.js";
import { formatAuditLogLine } from "../src/utils/apiLogger.js";

const DEFAULTS = {
  format: "markdown",
  rangeNm: AIRCRAFT_TRAFFIC_CONFIG.rangeNm,
  futureHours: 24,
  currentLookbackMinutes: 180,
  currentWindowMinutes: 720,
};

const AIRPORT_TIMEZONES = {
  KBOS: "America/New_York",
  KJFK: "America/New_York",
  KORD: "America/Chicago",
  KLAX: "America/Los_Angeles",
  KSFO: "America/Los_Angeles",
  KSEA: "America/Los_Angeles",
};

const DEFAULT_POC_AIRPORTS = ["KBOS", "KJFK", "KORD"];

const cleanString = (value) => String(value || "").trim();

const cleanUpper = (value) => cleanString(value).toUpperCase();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const percentile = (values, percentileValue) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1),
  );
  return Math.round(sorted[index]);
};

const average = (values) =>
  values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : 0;

const statusBuckets = () => ({
  status429: 0,
  status204: 0,
  status404: 0,
  status5xx: 0,
});

const countStatus = (buckets, status) => {
  const normalized = Number(status);
  if (normalized === 429) buckets.status429 += 1;
  else if (normalized === 204) buckets.status204 += 1;
  else if (normalized === 404) buckets.status404 += 1;
  else if (normalized >= 500) buckets.status5xx += 1;
};

const formatLocalParts = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const read = (type) => parts.find((part) => part.type === type)?.value || "";
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
  };
};

const formatLocalPathValue = (date, timeZone) => {
  const parts = formatLocalParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

const parseLocalDateTime = (value) => {
  const match = cleanString(value).match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/,
  );
  if (!match) throw new Error(`Invalid local datetime: ${value}`);
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
};

const addHoursToLocalDateTime = (value, hours) => {
  const parts = parseLocalDateTime(value);
  const date = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute),
  );
  date.setUTCHours(date.getUTCHours() + hours);
  const next = {
    year: date.getUTCFullYear(),
    month: String(date.getUTCMonth() + 1).padStart(2, "0"),
    day: String(date.getUTCDate()).padStart(2, "0"),
    hour: String(date.getUTCHours()).padStart(2, "0"),
    minute: String(date.getUTCMinutes()).padStart(2, "0"),
  };
  return `${next.year}-${next.month}-${next.day}T${next.hour}:${next.minute}`;
};

export function build24HourWindowPairs(
  startLocal,
  {
    totalHours = 24,
    maxWindowHours = 12,
  } = {},
) {
  const windows = [];
  let cursor = cleanString(startLocal);
  let remainingHours = totalHours;

  while (remainingHours > 0) {
    const hours = Math.min(maxWindowHours, remainingHours);
    const nextCursor = addHoursToLocalDateTime(cursor, hours);
    windows.push({ fromLocal: cursor, toLocal: nextCursor });
    cursor = nextCursor;
    remainingHours -= hours;
  }

  return windows;
}

export function parseCliArgs(argv) {
  const options = { ...DEFAULTS, airports: [] };

  for (const rawArg of argv || []) {
    const arg = cleanString(rawArg);
    if (!arg) continue;
    if (!arg.startsWith("--")) {
      options.airports.push(cleanUpper(arg));
      continue;
    }
    if (arg.startsWith("--format=")) {
      options.format = cleanString(arg.slice("--format=".length)) || DEFAULTS.format;
    } else if (arg.startsWith("--range-nm=")) {
      options.rangeNm = Number(arg.slice("--range-nm=".length)) || DEFAULTS.rangeNm;
    } else if (arg.startsWith("--future-hours=")) {
      options.futureHours =
        Number(arg.slice("--future-hours=".length)) || DEFAULTS.futureHours;
    } else if (arg.startsWith("--current-lookback-minutes=")) {
      options.currentLookbackMinutes =
        Number(arg.slice("--current-lookback-minutes=".length)) ||
        DEFAULTS.currentLookbackMinutes;
    } else if (arg.startsWith("--current-window-minutes=")) {
      options.currentWindowMinutes =
        Number(arg.slice("--current-window-minutes=".length)) ||
        DEFAULTS.currentWindowMinutes;
    }
  }

  return options;
}

const resolveAirportContext = (airportIcao) => {
  const icao = cleanUpper(airportIcao);
  const coords = COORDS[icao];
  const fallback = AIRPORT_FALLBACKS[icao] || {};
  if (!coords) {
    throw new Error(
      `No fallback coordinates for ${icao}. Add it to src/data/airportFallbacks.js or extend this POC.`,
    );
  }
  return {
    icao,
    iata: fallback.iata || "",
    name: fallback.name || icao,
    municipality: fallback.city || "",
    country: fallback.country || "",
    lat: coords[0],
    lon: coords[1],
    timezone: AIRPORT_TIMEZONES[icao] || "UTC",
  };
};

const routeContainsAirport = (route, airport) =>
  (route?.airports || [route?.origin, route?.destination])
    .filter(Boolean)
    .some(
      (item) =>
        item?.icao === airport.icao ||
        (airport.iata && item?.iata === airport.iata),
    );

const buildCurrentRouteAircraft = (rawAircraft) =>
  (rawAircraft || []).map((item) => ({
    callsign: cleanString(item?.flight || item?.r),
    lat: item?.lat,
    lon: item?.lon,
  }));

const flattenFlightCounts = (payload) => ({
  arrivals: Array.isArray(payload?.arrivals) ? payload.arrivals.length : 0,
  departures: Array.isArray(payload?.departures) ? payload.departures.length : 0,
});

const dedupeFlightIds = (flights) => new Set((flights || []).map((flight) => flight.id)).size;

const compareMergedWindowCounts = (groups, singleFlights) => ({
  mergedCount: dedupeFlightIds(groups.flat()),
  singleCount: dedupeFlightIds(singleFlights),
});

const endpointPathFromUrl = (url) => {
  try {
    return new URL(String(url), "http://localhost").pathname;
  } catch {
    return String(url || "");
  }
};

const withStderrAuditLogging = (fetchImpl, { service = "API" } = {}) => {
  return async (url, options) => {
    const start = performance.now();
    const endpointPath = endpointPathFromUrl(url) || service;
    try {
      const response = await fetchImpl(url, options);
      console.error(
        formatAuditLogLine({
          endpointPath,
          status: response.status,
          durationMs: Math.round(performance.now() - start),
        }),
      );
      return response;
    } catch (error) {
      console.error(
        formatAuditLogLine({
          endpointPath,
          status: "ERROR",
          durationMs: Math.round(performance.now() - start),
        }),
      );
      throw error;
    }
  };
};

function createAerodataboxClient({
  apiKey,
  apiHost = AERODATABOX_RAPIDAPI_HOST,
  fetchImpl = globalThis.fetch?.bind(globalThis),
} = {}) {
  if (!apiKey) {
    throw new Error("Missing AERODATABOX_RAPIDAPI_KEY");
  }
  if (!fetchImpl) throw new Error("This script requires fetch support");

  let nextAllowedAt = 0;
  const auditedFetch = withStderrAuditLogging(fetchImpl, {
    service: "aerodatabox",
  });

  const requestJson = async (url, { label, maxBytes = 2 * 1024 * 1024 } = {}) => {
    let lastResponse = null;
    const statuses = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const slot = reserveAerodataboxRequestSlot({
        now: Date.now(),
        nextAllowedAt,
      });
      nextAllowedAt = slot.nextAllowedAt;
      if (slot.delayMs > 0) await sleep(slot.delayMs);

      const startedAt = performance.now();
      const response = await auditedFetch(url, {
        headers: {
          Accept: "application/json",
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": apiHost,
        },
        signal: AbortSignal.timeout(20_000),
      });
      const durationMs = Math.round(performance.now() - startedAt);
      statuses.push(response.status);
      lastResponse = { response, durationMs };

      if (response.status !== 429 || attempt === 2) break;
      const retryAfterSeconds = Number(response.headers.get("retry-after"));
      const waitMs = Number.isFinite(retryAfterSeconds)
        ? retryAfterSeconds * 1000
        : (attempt + 1) * 5_000;
      await sleep(waitMs);
    }

    if (!lastResponse) {
      return { ok: false, status: 0, payload: null, durationMs: 0, statuses };
    }

    const { response, durationMs } = lastResponse;
    if (response.status === 204 || response.status === 404) {
      return { ok: false, status: response.status, payload: null, durationMs, statuses };
    }

    if (!response.ok) {
      return { ok: false, status: response.status, payload: null, durationMs, statuses };
    }

    const payload = await readResponseJson(response, {
      label,
      maxBytes,
    });
    return { ok: true, status: response.status, payload, durationMs, statuses };
  };

  return {
    requestJson,
    async fetchAirportHealth(airport) {
      return requestJson(buildAerodataboxAirportFeedsHealthUrl(airport.icao), {
        label: `${airport.icao} health`,
      });
    },
    async fetchAirportFidsRelative(airport, options = {}) {
      return requestJson(
        buildAerodataboxAirportFidsRelativeUrl(airport.icao, options),
        { label: `${airport.icao} airport FIDS relative` },
      );
    },
    async fetchAirportFidsWindow(airport, fromLocal, toLocal) {
      return requestJson(
        buildAerodataboxAirportFidsWindowUrl(airport.icao, fromLocal, toLocal),
        { label: `${airport.icao} airport FIDS window` },
      );
    },
    async fetchFlightStatusRoute(callsign, targetAirport) {
      const result = await requestJson(
        buildAerodataboxFlightUrl(callsign, resolveAerodataboxDateLocal()),
        { label: `${callsign} flight status route`, maxBytes: 512 * 1024 },
      );
      return {
        ...result,
        route: result.ok
          ? buildAerodataboxFlightRouteResponse(
              callsign,
              result.payload,
              targetAirport,
            )
          : null,
        suppressVrsRoute: shouldSuppressVrsRouteAfterAerodataboxStatus(result.status),
      };
    },
  };
}

const fetchVrsStandingRoute = async (callsign) => {
  const startedAt = performance.now();
  let response;
  try {
    response = await fetch(buildVrsRouteUrl(callsign), {
      headers: {
        Accept: "application/json",
        "User-Agent": VRS_ROUTE_USER_AGENT,
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { route: null, status: 0, durationMs: Math.round(performance.now() - startedAt) };
  }

  const durationMs = Math.round(performance.now() - startedAt);
  if (response.status === 404) {
    return { route: null, status: 404, durationMs };
  }
  if (!response.ok) {
    return { route: null, status: response.status, durationMs };
  }
  const payload = await readResponseJson(response, {
    label: `${callsign} VRS standing-data route`,
    maxBytes: 512 * 1024,
  });
  return {
    route: buildVrsRouteResponse(callsign, payload),
    status: response.status,
    durationMs,
  };
};

const fetchLiveAircraft = async (airport, rangeNm) => {
  const url = `https://api.adsb.lol/v2/lat/${encodeURIComponent(
    String(airport.lat),
  )}/lon/${encodeURIComponent(String(airport.lon))}/dist/${encodeURIComponent(
    String(rangeNm),
  )}`;
  const startedAt = performance.now();
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ADSBao/0.10.0 (https://github.com/orriduck/ADSBao)",
    },
    signal: AbortSignal.timeout(12_000),
  });
  const durationMs = Math.round(performance.now() - startedAt);
  if (!response.ok) {
    throw new Error(`adsb.lol HTTP ${response.status}`);
  }
  const payload = await readResponseJson(response, {
    label: `${airport.icao} adsb.lol snapshot`,
    maxBytes: 2 * 1024 * 1024,
  });
  return {
    payload,
    durationMs,
    aircraft: Array.isArray(payload?.ac) ? payload.ac : [],
  };
};

const runCurrentPathBenchmark = async ({ airport, liveAircraft, aerodataboxClient }) => {
  const lookupCallsigns = getLookupCallsigns(buildCurrentRouteAircraft(liveAircraft));
  const errors = statusBuckets();
  const latencies = [];
  let vrsCalls = 0;
  let aerodataboxFallbackCalls = 0;
  let matchedRoutes = 0;
  let multiLegRoutes = 0;
  let missingTargetRoutes = 0;

  for (const callsign of lookupCallsigns) {
    const startedAt = performance.now();
    const vrsResult = await fetchVrsStandingRoute(callsign);
    vrsCalls += 1;
    countStatus(errors, vrsResult.status);

    let finalRoute = vrsResult.route;
    if (vrsResult.route?.airports?.length > 2) multiLegRoutes += 1;
    if (vrsResult.route && !routeContainsAirport(vrsResult.route, airport)) {
      missingTargetRoutes += 1;
    }

    if (shouldUseAerodataboxFallback(vrsResult.route, airport)) {
      aerodataboxFallbackCalls += 1;
      const adbResult = await aerodataboxClient.fetchFlightStatusRoute(callsign, airport);
      for (const status of adbResult.statuses) countStatus(errors, status);
      if (adbResult.route) {
        finalRoute = adbResult.route;
      } else if (adbResult.suppressVrsRoute) {
        finalRoute = null;
      }
    }

    if (finalRoute) matchedRoutes += 1;
    latencies.push(Math.round(performance.now() - startedAt));
  }

  return {
    lookupCount: lookupCallsigns.length,
    vrsCalls,
    aerodataboxFallbackCalls,
    matchedRoutes,
    multiLegRoutes,
    missingTargetRoutes,
    errors,
    latencies,
  };
};

const groupWindowComparisons = (splitFlights, singleFlights) => {
  const [first, second, third] = splitFlights;
  return {
    h2: compareMergedWindowCounts([first], singleFlights.h2),
    h4: compareMergedWindowCounts([first, second], singleFlights.h4),
    h6: compareMergedWindowCounts([first, second, third], singleFlights.h6),
    h12: compareMergedWindowCounts(splitFlights, singleFlights.h12),
  };
};

const detectPaginationRisk = (comparisons) => {
  const likelyTruncated = Object.values(comparisons).some(
    ({ mergedCount, singleCount }) => mergedCount > singleCount,
  );
  return likelyTruncated ? "split-window-recommended" : "not-observed";
};

const runFidsBenchmark = async ({
  airport,
  liveAircraft,
  aerodataboxClient,
  options,
}) => {
  const errors = statusBuckets();
  const latencies = [];

  const healthResult = await aerodataboxClient.fetchAirportHealth(airport);
  for (const status of healthResult.statuses) countStatus(errors, status);

  const currentWindowResult = await aerodataboxClient.fetchAirportFidsRelative(airport, {
    offsetMinutes: -options.currentLookbackMinutes,
    durationMinutes: options.currentWindowMinutes,
  });
  for (const status of currentWindowResult.statuses) countStatus(errors, status);
  latencies.push(currentWindowResult.durationMs);
  const currentFlights = currentWindowResult.ok
    ? flattenAirportFidsResponse(currentWindowResult.payload, {
        focusAirport: airport,
      })
    : [];

  const splitOffsets = [-180, -60, 60, 180, 300, 420];
  const splitDurations = [];
  for (const offsetMinutes of splitOffsets) {
    const result =
      offsetMinutes === -180
        ? currentWindowResult.durationMinutes === 120
          ? currentWindowResult
          : await aerodataboxClient.fetchAirportFidsRelative(airport, {
              offsetMinutes,
              durationMinutes: 120,
            })
        : await aerodataboxClient.fetchAirportFidsRelative(airport, {
            offsetMinutes,
            durationMinutes: 120,
          });
    for (const status of result.statuses) countStatus(errors, status);
    latencies.push(result.durationMs);
    splitDurations.push(
      result.ok
        ? flattenAirportFidsResponse(result.payload, { focusAirport: airport })
        : [],
    );
  }

  const singleWindows = {};
  for (const durationMinutes of [120, 240, 360]) {
    const result = await aerodataboxClient.fetchAirportFidsRelative(airport, {
      offsetMinutes: -180,
      durationMinutes,
    });
    for (const status of result.statuses) countStatus(errors, status);
    latencies.push(result.durationMs);
    singleWindows[`h${durationMinutes / 60}`] = result.ok
      ? flattenAirportFidsResponse(result.payload, { focusAirport: airport })
      : [];
  }
  singleWindows.h12 = currentFlights;

  const comparisons = groupWindowComparisons(splitDurations, singleWindows);
  const paginationRisk = detectPaginationRisk(comparisons);

  const startLocal = formatLocalPathValue(new Date(), airport.timezone);
  const futureWindows = build24HourWindowPairs(startLocal, {
    totalHours: options.futureHours,
    maxWindowHours: 12,
  });

  let futureFlights = [];
  let futureRawCount = 0;
  for (const window of futureWindows) {
    const result = await aerodataboxClient.fetchAirportFidsWindow(
      airport,
      window.fromLocal,
      window.toLocal,
    );
    for (const status of result.statuses) countStatus(errors, status);
    latencies.push(result.durationMs);
    if (!result.ok) continue;
    const flights = flattenAirportFidsResponse(result.payload, {
      focusAirport: airport,
    });
    futureRawCount += flights.length;
    futureFlights = futureFlights.concat(flights);
  }

  const futureDeduped = dedupeFlightIds(futureFlights);
  const matches = matchAirportFidsAircraftList(liveAircraft, currentFlights, {
    focusAirport: airport,
    now: new Date(),
  });

  return {
    calls: 1 + splitDurations.length + 3 + futureWindows.length,
    health: healthResult.ok
      ? normalizeAirportFidsFeedCoverage(healthResult.payload)
      : normalizeAirportFidsFeedCoverage({}),
    currentWindow: {
      ...flattenFlightCounts(currentWindowResult.payload),
      dedupedFlights: currentFlights.length,
    },
    future24h: {
      windowCount: futureWindows.length,
      totalFlights: futureDeduped,
      duplicates: Math.max(0, futureRawCount - futureDeduped),
      windows: futureWindows,
    },
    pagination: {
      comparisons,
      splitWindowCount: dedupeFlightIds(splitDurations.flat()),
    },
    paginationRisk,
    matched: matches.summary,
    errors,
    latencies,
  };
};

const buildVerdict = ({ currentPath, fidsPath }) => {
  const currentCalls = currentPath.vrsCalls + currentPath.aerodataboxFallbackCalls;
  const callReductionPct =
    currentCalls > 0 ? Number((((currentCalls - fidsPath.calls) / currentCalls) * 100).toFixed(1)) : 0;
  const highMedium = fidsPath.matched.high + fidsPath.matched.medium;
  const matchedTotal = highMedium + fidsPath.matched.low + fidsPath.matched.unmatched;
  const matchQualityRatio = matchedTotal > 0 ? highMedium / matchedTotal : 0;
  const recommended =
    callReductionPct >= 50 &&
    matchQualityRatio >= 0.4 &&
    fidsPath.paginationRisk !== "split-window-required-unresolved";

  return {
    callReductionPct,
    matchQuality: matchQualityRatio >= 0.5 ? "promising" : "weak",
    recommended,
  };
};

export function renderMarkdownReport(report) {
  const lines = [
    `# Airport FIDS POC Report`,
    ``,
    `Generated at: ${report.generatedAt}`,
    ``,
    `| airport | live aircraft | current route calls | current ADB fallback calls | fids calls | matched high | matched medium | unmatched | est call reduction | latency delta |`,
    `| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |`,
  ];

  for (const item of report.airports) {
    const latencyDelta = item.latency.currentAvgMs - item.latency.fidsAvgMs;
    lines.push(
      `| ${item.airport.icao} | ${item.liveAircraftCount} | ${item.currentPath.lookupCount} | ${item.currentPath.aerodataboxFallbackCalls} | ${item.fidsPath.calls} | ${item.fidsPath.matched.high} | ${item.fidsPath.matched.medium} | ${item.fidsPath.matched.unmatched} | ${item.verdict.callReductionPct}% | ${latencyDelta}ms |`,
    );
  }

  for (const item of report.airports) {
    lines.push("");
    lines.push(`## ${item.airport.icao} / ${item.airport.iata}`);
    lines.push("");
    lines.push(
      `Health: schedules ${item.health.flightSchedulesStatus || "-"}, live ${item.health.liveUpdatesStatus || "-"}, adsb ${item.health.adsbUpdatesStatus || "-"}`,
    );
    lines.push(
      `Current path: ${item.currentPath.matchedRoutes}/${item.currentPath.lookupCount} routes matched, ${item.currentPath.multiLegRoutes} multi-leg, ${item.currentPath.missingTargetRoutes} missing-target.`,
    );
    lines.push(
      `FIDS current window: ${item.fidsPath.currentWindow.arrivals} arrivals, ${item.fidsPath.currentWindow.departures} departures, ${item.fidsPath.currentWindow.dedupedFlights || 0} deduped flights.`,
    );
    lines.push(
      `future 24h: ${item.fidsPath.future24h.windowCount} windows, ${item.fidsPath.future24h.totalFlights} deduped flights, ${item.fidsPath.future24h.duplicates} duplicates.`,
    );
    lines.push(
      `Pagination risk: ${item.fidsPath.paginationRisk}.`,
    );
    lines.push(
      `Latency: current avg ${item.latency.currentAvgMs}ms / p95 ${item.latency.currentP95Ms}ms, fids avg ${item.latency.fidsAvgMs}ms / p95 ${item.latency.fidsP95Ms}ms.`,
    );
    lines.push(
      `Go/No-Go: ${item.verdict.recommended ? "go" : "no-go"}.`,
    );
  }

  return lines.join("\n");
}

const runAirport = async (airport, options, aerodataboxClient) => {
  const liveAircraftResult = await fetchLiveAircraft(airport, options.rangeNm);
  const currentPath = await runCurrentPathBenchmark({
    airport,
    liveAircraft: liveAircraftResult.aircraft,
    aerodataboxClient,
  });
  const fidsPath = await runFidsBenchmark({
    airport,
    liveAircraft: liveAircraftResult.aircraft,
    aerodataboxClient,
    options,
  });

  return {
    airport,
    health: fidsPath.health,
    liveAircraftCount: liveAircraftResult.aircraft.length,
    currentPath,
    fidsPath,
    latency: {
      currentAvgMs: average(currentPath.latencies),
      currentP95Ms: percentile(currentPath.latencies, 95),
      fidsAvgMs: average(fidsPath.latencies),
      fidsP95Ms: percentile(fidsPath.latencies, 95),
    },
    errors: {
      current: currentPath.errors,
      fids: fidsPath.errors,
    },
    verdict: buildVerdict({ currentPath, fidsPath }),
  };
};

const main = async () => {
  const options = parseCliArgs(process.argv.slice(2));
  const airportCodes = options.airports.length ? options.airports : DEFAULT_POC_AIRPORTS;
  const airports = airportCodes.map(resolveAirportContext);
  const aerodataboxClient = createAerodataboxClient({
    apiKey: process.env.AERODATABOX_RAPIDAPI_KEY || "",
    apiHost: process.env.AERODATABOX_RAPIDAPI_HOST || AERODATABOX_RAPIDAPI_HOST,
  });

  const output = {
    generatedAt: new Date().toISOString(),
    airports: [],
  };

  for (const airport of airports) {
    output.airports.push(await runAirport(airport, options, aerodataboxClient));
  }

  if (options.format === "json") {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(renderMarkdownReport(output));
  }
};

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
