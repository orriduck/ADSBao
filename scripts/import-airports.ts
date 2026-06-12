import { createClient } from "@supabase/supabase-js";

const AIRPORTS_URL =
  process.env.OURAIRPORTS_AIRPORTS_URL ||
  "https://davidmegginson.github.io/ourairports-data/airports.csv";

const AIRPORTS_TABLE = "airports";
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

const normalizeIdent = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const mapAirportRow = (row: Record<string, string>) => {
  const ident = normalizeIdent(row.ident);
  const name = String(row.name || "").trim();
  // Names are the whole point of this table; skip rows that can't be keyed or
  // that carry no usable name.
  if (!ident || !name) return null;
  return {
    ident,
    ourairports_id: numberOrNull(row.id),
    type: String(row.type || "").trim(),
    name,
    latitude_deg: numberOrNull(row.latitude_deg),
    longitude_deg: numberOrNull(row.longitude_deg),
    iso_country: String(row.iso_country || "").trim().toUpperCase(),
    municipality: String(row.municipality || "").trim(),
    icao_code: normalizeIdent(row.icao_code),
    iata_code: normalizeIdent(row.iata_code),
  };
};

const requireEnv = (name: string, value: string | undefined) => {
  if (!value) throw new Error(`${name} is required`);
  return value;
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
  supabase,
  rows,
}: {
  supabase: any;
  rows: Record<string, any>[];
}) {
  console.log(`[import-airports] Clearing ${AIRPORTS_TABLE}`);
  const tableQuery = supabase.from(AIRPORTS_TABLE) as any;
  // `ident` is the text primary key and is never empty, so this clears the table.
  const { error: deleteError } = await tableQuery.delete().neq("ident", "");
  if (deleteError) throw new Error(`${AIRPORTS_TABLE} clear failed: ${deleteError.message}`);

  let imported = 0;
  for (let index = 0; index < rows.length; index += CHUNK_SIZE) {
    const chunk = rows.slice(index, index + CHUNK_SIZE);
    const { error } = await tableQuery.upsert(chunk, { onConflict: "ident" });
    if (error) throw new Error(`${AIRPORTS_TABLE} upsert failed: ${error.message}`);
    imported += chunk.length;
    console.log(`[import-airports] Imported ${imported}/${rows.length} ${AIRPORTS_TABLE}`);
  }
}

async function main() {
  const supabaseUrl = requireEnv(
    "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  );
  const serviceKey = requireEnv(
    "SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
  );

  console.log(`[import-airports] Fetching ${AIRPORTS_URL}`);
  const airportRows = (await fetchCsvRows(AIRPORTS_URL))
    .map(mapAirportRow)
    .filter(Boolean) as Record<string, any>[];

  // De-duplicate on the primary key so a single upsert chunk never carries two
  // rows with the same ident (OurAirports occasionally repeats identifiers).
  const byIdent = new Map<string, Record<string, any>>();
  for (const row of airportRows) byIdent.set(row.ident, row);
  const dedupedRows = [...byIdent.values()];

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  await replaceRows({ supabase, rows: dedupedRows });

  console.log(
    `[import-airports] Done. Imported ${dedupedRows.length} airports.`,
  );
}

main().catch((error) => {
  console.error("[import-airports] failed:", error);
  process.exit(1);
});
