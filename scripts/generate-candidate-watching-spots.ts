import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { COORDS } from "../src/data/airportFallbacks";
import { createRunwayGeometryRepositoryFromEnv } from "../src/app/api/dao/runwayGeometries.dao";
import { buildRunwayMapFromGeometries } from "../src/features/airport/runways/runwayGeometryMap";
import {
  buildCandidateWatchingSpotFile,
  buildCandidateWatchingSpotSearchBBox,
  buildOverpassQuery,
  filterAndScoreCandidateElements,
} from "../src/features/airport/watcher/candidateWatchingSpotsModel";

type ScriptRecord = Record<string, any>;

const RUNWAYS_URL =
  process.env.OURAIRPORTS_RUNWAYS_URL ||
  "https://davidmegginson.github.io/ourairports-data/runways.csv";
const OVERPASS_ENDPOINT =
  process.env.OVERPASS_ENDPOINT || "https://overpass-api.de/api/interpreter";
const OUTPUT_DIR = join(process.cwd(), "public", "data", "spotting-spots");
const DEFAULT_AIRPORTS = ["KBOS", "JFK"];

const normalizeCode = (value: unknown) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const resolveAirportIdent = (code: string) => {
  const normalized = normalizeCode(code);
  if (COORDS[normalized]) return normalized;
  const usPrefixed = `K${normalized}`;
  if (normalized.length === 3 && COORDS[usPrefixed]) return usPrefixed;
  return normalized;
};

const airportCenterFor = (ident: string) => {
  const coords = COORDS[ident];
  if (!coords) return null;
  return { lat: coords[0], lon: coords[1] };
};

const parseCsvRows = (text: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === "\"" && next === "\"") {
        field += "\"";
        index += 1;
      } else if (char === "\"") {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === "\"") quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [header = [], ...records] = rows;
  return records
    .filter((record) => record.length > 1)
    .map((record) =>
      Object.fromEntries(header.map((key, index) => [key, record[index] ?? ""])),
    );
};

const numberOrNull = (value: unknown) => {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const numeric = Number(text);
  return Number.isFinite(numeric) ? numeric : null;
};

const boolValue = (value: unknown) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true";
};

const mapRunwayCsvRow = (row: Record<string, string>) => ({
  lengthFt: numberOrNull(row.length_ft),
  widthFt: numberOrNull(row.width_ft),
  closed: boolValue(row.closed),
  le: {
    ident: normalizeCode(row.le_ident),
    lat: numberOrNull(row.le_latitude_deg),
    lon: numberOrNull(row.le_longitude_deg),
  },
  he: {
    ident: normalizeCode(row.he_ident),
    lat: numberOrNull(row.he_latitude_deg),
    lon: numberOrNull(row.he_longitude_deg),
  },
});

async function readRunwayMapFromRepository(airportIdent: string) {
  const repository = createRunwayGeometryRepositoryFromEnv();
  if (!repository?.getRunwaysByAirportIdent) return null;
  try {
    const runways = await repository.getRunwaysByAirportIdent(airportIdent);
    return buildRunwayMapFromGeometries({
      airport: airportIdent,
      runways,
      source: "OurAirports",
    });
  } catch (error: any) {
    console.warn(
      `[watching-spots] Existing runway geometry read failed for ${airportIdent}: ${error?.message || error}`,
    );
    return null;
  }
}

async function readRunwayMapFromCsv(airportIdent: string) {
  const response = await fetch(RUNWAYS_URL, {
    headers: { Accept: "text/csv" },
  });
  if (!response.ok) {
    throw new Error(`OurAirports runways download failed: HTTP ${response.status}`);
  }
  const rows = parseCsvRows(await response.text())
    .filter((row: ScriptRecord) => normalizeCode(row.airport_ident) === airportIdent)
    .map(mapRunwayCsvRow);

  return buildRunwayMapFromGeometries({
    airport: airportIdent,
    runways: rows,
    source: "OurAirports",
  });
}

async function readRunwayMap(airportIdent: string) {
  return (
    (await readRunwayMapFromRepository(airportIdent)) ||
    (await readRunwayMapFromCsv(airportIdent))
  );
}

async function queryOverpass(overpassQuery: string) {
  const response = await fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "User-Agent":
        "ADSBao candidate-watching-spots generator (https://github.com/orriduck/ADSBao)",
    },
    body: new URLSearchParams({ data: overpassQuery }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Overpass query failed: HTTP ${response.status} ${text.slice(0, 240)}`,
    );
  }
  return response.json();
}

async function generateForAirport(inputCode: string) {
  const outputCode = normalizeCode(inputCode);
  const airportIdent = resolveAirportIdent(outputCode);
  const airportCenter = airportCenterFor(airportIdent);
  const runwayMap = await readRunwayMap(airportIdent);
  if (!airportCenter) {
    console.warn(
      `[watching-spots] Skipping ${outputCode}: airport center is unavailable.`,
    );
    return null;
  }

  if (!runwayMap?.runways?.length) {
    console.warn(
      `[watching-spots] ${outputCode}: runway endpoint geometry unavailable; scoring nearby candidates without runway alignment.`,
    );
  }

  const bbox = buildCandidateWatchingSpotSearchBBox({ airportCenter });
  if (!bbox) {
    console.warn(`[watching-spots] Skipping ${outputCode}: no nearby search area.`);
    return null;
  }

  const overpassQuery = buildOverpassQuery(bbox);
  console.log(
    `[watching-spots] Querying ${outputCode} bbox ${bbox.south.toFixed(5)},${bbox.west.toFixed(5)},${bbox.north.toFixed(5)},${bbox.east.toFixed(5)}`,
  );
  const payload = await queryOverpass(overpassQuery);
  const spots = filterAndScoreCandidateElements({
    airportIcao: airportIdent,
    airportCenter,
    runwayMap,
    elements: payload?.elements || [],
    limit: 5,
  });
  const file = buildCandidateWatchingSpotFile({
    airportIcao: airportIdent,
    spots,
  });
  await mkdir(OUTPUT_DIR, { recursive: true });
  const outputPath = join(OUTPUT_DIR, `${outputCode}.json`);
  await writeFile(outputPath, `${JSON.stringify(file, null, 2)}\n`, "utf8");
  console.log(
    `[watching-spots] Wrote ${spots.length} candidate spots for ${airportIdent} to ${outputPath}`,
  );
  return file;
}

async function main() {
  const airports = process.argv.slice(2).map(normalizeCode).filter(Boolean);
  const requestedAirports = airports.length ? airports : DEFAULT_AIRPORTS;

  for (const airport of requestedAirports) {
    await generateForAirport(airport);
  }
}

main().catch((error) => {
  console.error("[watching-spots] failed:", error);
  process.exit(1);
});
