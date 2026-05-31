import { createClient } from "@supabase/supabase-js";

import { downloadAndParseDataset } from "./ourAirportsDownloader";
import {
  normalizeAirports,
  normalizeFrequencies,
  normalizeNavaids,
  normalizeRunways,
} from "./ourAirportsNormalizer";
import { OUR_AIRPORTS_DATASETS } from "./ourAirportsCsvSources";

const DEFAULT_BATCH_SIZE = 5000;

const upsertInBatches = async ({
  client,
  table,
  rows,
  onConflict,
  batchSize = DEFAULT_BATCH_SIZE,
}) => {
  for (let start = 0; start < rows.length; start += batchSize) {
    const slice = rows.slice(start, start + batchSize);
    const { error } = await client
      .from(table)
      .upsert(slice, { onConflict });
    if (error) {
      throw new Error(
        `OurAirports upsert into ${table} failed (${error.message}) at offset ${start}`,
      );
    }
  }
};

// Per-table descriptors keep the SWR scheduler and the bulk CLI sharing a
// single source of truth for the dataset → table mapping.
export const OUR_AIRPORTS_TABLES = Object.freeze({
  airports: {
    table: "airports",
    dataset: OUR_AIRPORTS_DATASETS.airports,
    normalize: normalizeAirports,
    onConflict: "ident",
  },
  runways: {
    table: "runways",
    dataset: OUR_AIRPORTS_DATASETS.runways,
    normalize: normalizeRunways,
    onConflict: "id",
  },
  frequencies: {
    table: "airport_frequencies",
    dataset: OUR_AIRPORTS_DATASETS.frequencies,
    normalize: normalizeFrequencies,
    onConflict: "id",
  },
  navaids: {
    table: "navaids",
    dataset: OUR_AIRPORTS_DATASETS.navaids,
    normalize: normalizeNavaids,
    onConflict: "id",
  },
});

export const OUR_AIRPORTS_TABLE_ORDER = Object.freeze([
  "airports",
  "runways",
  "frequencies",
  "navaids",
]);

export const createOurAirportsImporter = ({
  supabaseUrl,
  supabaseKey,
  createClientImpl = createClient,
  fetchImpl = globalThis.fetch?.bind(globalThis),
  log = () => {},
} = {}) => {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "OurAirports importer requires supabaseUrl and supabaseKey (service role)",
    );
  }
  if (typeof fetchImpl !== "function") {
    throw new Error("OurAirports importer requires a fetch implementation");
  }

  const client = createClientImpl(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  const importTable = async (key, { batchSize = DEFAULT_BATCH_SIZE } = {}) => {
    const spec = OUR_AIRPORTS_TABLES[key];
    if (!spec) throw new Error(`Unknown OurAirports table key: ${key}`);

    log(`Downloading ${spec.dataset.filename} ...`);
    const result = await downloadAndParseDataset(spec.dataset, { fetchImpl });
    const rows = spec.normalize(result.rows);
    log(`Parsed ${rows.length} rows for ${spec.table}`);
    log(`Upserting ${spec.table} ...`);
    await upsertInBatches({
      client,
      table: spec.table,
      rows,
      onConflict: spec.onConflict,
      batchSize,
    });
    return rows.length;
  };

  return {
    importTable,
    async import({ batchSize = DEFAULT_BATCH_SIZE } = {}) {
      const counts = {};
      for (const key of OUR_AIRPORTS_TABLE_ORDER) {
        counts[key] = await importTable(key, { batchSize });
      }
      return counts;
    },
  };
};

export const createOurAirportsImporterFromEnv = ({
  env = process.env,
  ...rest
} = {}) =>
  createOurAirportsImporter({
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL,
    supabaseKey:
      env.SUPABASE_SERVICE_ROLE_KEY ||
      env.SUPABASE_SECRET_KEY,
    ...rest,
  });
