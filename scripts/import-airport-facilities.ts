import {
  bulkUpsertRows,
  createImportDatabaseFromEnv,
} from "./postgresImport";

const FREQUENCIES_URL =
  process.env.OURAIRPORTS_FREQUENCIES_URL ||
  "https://davidmegginson.github.io/ourairports-data/airport-frequencies.csv";
const NAVAIDS_URL =
  process.env.OURAIRPORTS_NAVAIDS_URL ||
  "https://davidmegginson.github.io/ourairports-data/navaids.csv";

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

const positiveNumberOrNull = (value: unknown) => {
  const numeric = numberOrNull(value);
  return numeric != null && numeric > 0 ? numeric : null;
};

const normalizeIdent = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const mapFrequencyRow = (row: Record<string, string>) => {
  const id = numberOrNull(row.id);
  const airportIdent = normalizeIdent(row.airport_ident);
  if (id == null || !airportIdent) return null;
  return {
    id,
    airport_ref: numberOrNull(row.airport_ref),
    airport_ident: airportIdent,
    type: String(row.type || "").trim().toUpperCase(),
    description: String(row.description || "").trim(),
    frequency_mhz: positiveNumberOrNull(row.frequency_mhz),
  };
};

const mapNavaidRow = (row: Record<string, string>) => {
  const id = numberOrNull(row.id);
  const ident = normalizeIdent(row.ident);
  if (id == null || !ident) return null;
  return {
    id,
    filename: String(row.filename || "").trim(),
    ident,
    name: String(row.name || "").trim(),
    type: String(row.type || "").trim().toUpperCase(),
    frequency_khz: numberOrNull(row.frequency_khz),
    latitude_deg: numberOrNull(row.latitude_deg),
    longitude_deg: numberOrNull(row.longitude_deg),
    elevation_ft: numberOrNull(row.elevation_ft),
    iso_country: String(row.iso_country || "").trim().toUpperCase(),
    dme_frequency_khz: numberOrNull(row.dme_frequency_khz),
    dme_channel: String(row.dme_channel || "").trim(),
    dme_latitude_deg: numberOrNull(row.dme_latitude_deg),
    dme_longitude_deg: numberOrNull(row.dme_longitude_deg),
    dme_elevation_ft: numberOrNull(row.dme_elevation_ft),
    slaved_variation_deg: numberOrNull(row.slaved_variation_deg),
    magnetic_variation_deg: numberOrNull(row.magnetic_variation_deg),
    usage_type: String(row.usage_type || "").trim(),
    power: String(row.power || "").trim(),
    associated_airport: normalizeIdent(row.associated_airport),
  };
};

async function fetchCsvRows(url: string) {
  const response = await fetch(url, {
    headers: { Accept: "text/csv" },
  });
  if (!response.ok) {
    throw new Error(`OurAirports download failed: ${url} HTTP ${response.status}`);
  }
  return parseCsvRows(await response.text());
}

async function replaceRows({
  queryClient,
  table,
  rows,
  columns,
}: {
  queryClient: any;
  table: string;
  rows: Record<string, any>[];
  columns: string[];
}) {
  console.log(`[import-airport-facilities] Clearing ${table}`);
  await queryClient.query(`delete from "${table}" where id <> -1`);

  let imported = 0;
  for (let index = 0; index < rows.length; index += CHUNK_SIZE) {
    const chunk = rows.slice(index, index + CHUNK_SIZE);
    await bulkUpsertRows({
      queryClient,
      table,
      columns,
      conflictColumns: ["id"],
      rows: chunk,
    });
    imported += chunk.length;
    console.log(`[import-airport-facilities] Imported ${imported}/${rows.length} ${table}`);
  }
}

async function main() {
  console.log(`[import-airport-facilities] Fetching ${FREQUENCIES_URL}`);
  const frequencyRows = (await fetchCsvRows(FREQUENCIES_URL))
    .map(mapFrequencyRow)
    .filter(Boolean);
  console.log(`[import-airport-facilities] Fetching ${NAVAIDS_URL}`);
  const navaidRows = (await fetchCsvRows(NAVAIDS_URL))
    .map(mapNavaidRow)
    .filter(Boolean);

  const queryClient = createImportDatabaseFromEnv();
  try {
    await replaceRows({
      queryClient,
      table: "airport_frequencies",
      rows: frequencyRows,
      columns: [
        "id",
        "airport_ref",
        "airport_ident",
        "type",
        "description",
        "frequency_mhz",
      ],
    });
    await replaceRows({
      queryClient,
      table: "navaids",
      rows: navaidRows,
      columns: [
        "id",
        "filename",
        "ident",
        "name",
        "type",
        "frequency_khz",
        "latitude_deg",
        "longitude_deg",
        "elevation_ft",
        "iso_country",
        "dme_frequency_khz",
        "dme_channel",
        "dme_latitude_deg",
        "dme_longitude_deg",
        "dme_elevation_ft",
        "slaved_variation_deg",
        "magnetic_variation_deg",
        "usage_type",
        "power",
        "associated_airport",
      ],
    });
  } finally {
    await queryClient.dispose?.();
  }

  console.log(
    `[import-airport-facilities] Done. Imported ${frequencyRows.length} frequencies and ${navaidRows.length} navaids.`,
  );
}

main().catch((error) => {
  console.error("[import-airport-facilities] failed:", error);
  process.exit(1);
});
