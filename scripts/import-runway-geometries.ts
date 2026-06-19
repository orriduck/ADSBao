import {
  bulkUpsertRows,
  createImportDatabaseFromEnv,
  quoteQualifiedIdentifier,
} from "./postgresImport";

const RUNWAYS_URL =
  process.env.OURAIRPORTS_RUNWAYS_URL ||
  "https://davidmegginson.github.io/ourairports-data/runways.csv";

const RUNWAY_GEOMETRIES_TABLE = "ourairports.runway_geometries";
const CHUNK_SIZE = 1000;

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

    if (char === "\"") {
      quoted = true;
    } else if (char === ",") {
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

const normalizeIdent = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const mapRunwayRow = (row: Record<string, string>) => {
  const sourceId = String(row.id || "").trim();
  const airportIdent = normalizeIdent(row.airport_ident);
  if (!sourceId || !airportIdent) return null;

  return {
    source: "ourairports",
    source_id: sourceId,
    airport_ident: airportIdent,
    length_ft: numberOrNull(row.length_ft),
    width_ft: numberOrNull(row.width_ft),
    surface: String(row.surface || "").trim(),
    lighted: boolValue(row.lighted),
    closed: boolValue(row.closed),
    le_ident: normalizeIdent(row.le_ident),
    le_latitude_deg: numberOrNull(row.le_latitude_deg),
    le_longitude_deg: numberOrNull(row.le_longitude_deg),
    le_elevation_ft: numberOrNull(row.le_elevation_ft),
    le_heading_deg_t: numberOrNull(row.le_heading_deg_t),
    le_displaced_threshold_ft: numberOrNull(row.le_displaced_threshold_ft),
    he_ident: normalizeIdent(row.he_ident),
    he_latitude_deg: numberOrNull(row.he_latitude_deg),
    he_longitude_deg: numberOrNull(row.he_longitude_deg),
    he_elevation_ft: numberOrNull(row.he_elevation_ft),
    he_heading_deg_t: numberOrNull(row.he_heading_deg_t),
    he_displaced_threshold_ft: numberOrNull(row.he_displaced_threshold_ft),
  };
};

async function main() {
  console.log(`[import-runway-geometries] Fetching ${RUNWAYS_URL}`);
  const response = await fetch(RUNWAYS_URL, {
    headers: { Accept: "text/csv" },
  });
  if (!response.ok) {
    throw new Error(`OurAirports runways download failed: HTTP ${response.status}`);
  }

  const rows = parseCsvRows(await response.text())
    .map(mapRunwayRow)
    .filter(Boolean);

  const queryClient = createImportDatabaseFromEnv();

  console.log("[import-runway-geometries] Clearing existing OurAirports runway geometry rows");
  try {
    await queryClient.query(
      `delete from ${quoteQualifiedIdentifier(RUNWAY_GEOMETRIES_TABLE)} where source = $1`,
      ["ourairports"],
    );

    let imported = 0;
    for (let index = 0; index < rows.length; index += CHUNK_SIZE) {
      const chunk = rows.slice(index, index + CHUNK_SIZE);
      await bulkUpsertRows({
        queryClient,
        table: RUNWAY_GEOMETRIES_TABLE,
        columns: [
          "source",
          "source_id",
          "airport_ident",
          "length_ft",
          "width_ft",
          "surface",
          "lighted",
          "closed",
          "le_ident",
          "le_latitude_deg",
          "le_longitude_deg",
          "le_elevation_ft",
          "le_heading_deg_t",
          "le_displaced_threshold_ft",
          "he_ident",
          "he_latitude_deg",
          "he_longitude_deg",
          "he_elevation_ft",
          "he_heading_deg_t",
          "he_displaced_threshold_ft",
        ],
        conflictColumns: ["source", "source_id"],
        rows: chunk,
      });
      imported += chunk.length;
      console.log(`[import-runway-geometries] Imported ${imported}/${rows.length}`);
    }

    console.log(`[import-runway-geometries] Done. Imported ${imported} rows.`);
  } finally {
    await queryClient.dispose?.();
  }
}

main().catch((error) => {
  console.error("[import-runway-geometries] failed:", error);
  process.exit(1);
});
