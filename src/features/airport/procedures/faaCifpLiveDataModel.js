import {
  buildProcedureIndex,
  parseFaaCifpProcedures,
  renderProcedureGeoJson,
} from "./faaCifpProcedureModel.js";

const MONTHS = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

const PROCEDURE_PRIORITY = {
  "RNAV (GPS)": 0,
  ILS: 1,
  LOC: 2,
  "RNAV (RNP)": 3,
};

const parseDate = (month, day, year) => {
  const monthIndex = MONTHS[month];
  if (monthIndex == null) return null;
  return new Date(Date.UTC(Number(year), monthIndex, Number(day)));
};

const isoDate = (date) => date.toISOString().slice(0, 10);

const sameOrAfter = (left, right) => left.getTime() >= right.getTime();

const before = (left, right) => left.getTime() < right.getTime();

const normalizeUrl = (href, pageUrl) => new URL(href, pageUrl).toString();

export function discoverActiveCifpRelease({ html, now = new Date(), pageUrl }) {
  const releases = [];
  const pattern =
    /href="([^"]*CIFP_(\d{6})\.zip)"[^>]*>[^<]*CIFP\s+\2[^<]*<\/a>[\s\S]*?\(Zip\)[\s\S]*?([A-Z][a-z]{2})\s+(\d{1,2}),\s+(\d{4})[\s\S]*?([A-Z][a-z]{2})\s+(\d{1,2}),\s+(\d{4})/g;

  for (const match of html.matchAll(pattern)) {
    const effectiveStart = parseDate(match[3], match[4], match[5]);
    const effectiveEnd = parseDate(match[6], match[7], match[8]);
    if (!effectiveStart || !effectiveEnd) continue;
    releases.push({
      cycle: match[2],
      url: normalizeUrl(match[1], pageUrl),
      effectiveStart,
      effectiveEnd,
    });
  }

  if (releases.length === 0) {
    throw new Error("No FAA CIFP releases found on download page");
  }

  const active = releases.find(
    (release) =>
      sameOrAfter(now, release.effectiveStart) && before(now, release.effectiveEnd),
  );
  const selected =
    active ||
    releases.toSorted((left, right) => right.cycle.localeCompare(left.cycle))[0];

  return {
    cycle: selected.cycle,
    url: selected.url,
    effectiveStart: isoDate(selected.effectiveStart),
    effectiveEnd: isoDate(selected.effectiveEnd),
  };
}

const procedurePriority = (procedure) => {
  const match = Object.keys(PROCEDURE_PRIORITY).find((prefix) =>
    procedure.name.startsWith(prefix),
  );
  return PROCEDURE_PRIORITY[match] ?? 9;
};

const sortProceduresForDisplay = (procedures) =>
  procedures.toSorted((left, right) => {
    const byPriority = procedurePriority(left) - procedurePriority(right);
    if (byPriority !== 0) return byPriority;
    return left.name.localeCompare(right.name);
  });

export function combineProcedureGeoJson({ procedures }) {
  const rendered = procedures.map(renderProcedureGeoJson);
  return {
    type: "FeatureCollection",
    properties: {
      source: "FAA CIFP",
      airport: procedures[0]?.airport || "",
      sourceCycle: procedures[0]?.sourceCycle || "",
      procedureCount: procedures.length,
      procedureIds: procedures.map((procedure) => procedure.id),
      warnings: rendered.flatMap((geojson) => geojson.properties?.warnings || []),
    },
    features: rendered.flatMap((geojson) => geojson.features || []),
  };
}

export function buildLiveProcedurePayload({
  lines,
  airport,
  cycle,
  maxProcedures = 12,
}) {
  const { procedures } = parseFaaCifpProcedures({ lines, airport, cycle });
  const selectedProcedures = sortProceduresForDisplay(procedures).slice(
    0,
    maxProcedures,
  );

  return {
    index: buildProcedureIndex({
      airport,
      cycle,
      procedures: selectedProcedures,
    }),
    geojson: combineProcedureGeoJson({ procedures: selectedProcedures }),
  };
}
