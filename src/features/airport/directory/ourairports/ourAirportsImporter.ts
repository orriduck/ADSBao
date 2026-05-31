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

type OurAirportsTableKey = "airports" | "runways" | "frequencies" | "navaids";
type OurAirportsImportCounts = Record<OurAirportsTableKey, number>;
type CsvFetchResponse = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
};
type CsvFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<CsvFetchResponse>;
type SupabaseUpsertClient = {
  from: (table: string) => {
    upsert: (
      rows: unknown[],
      options: { onConflict: string },
    ) => Promise<{ error?: { message?: string } | null }>;
  };
};
type CreateClientImpl = (
  supabaseUrl: string,
  supabaseKey: string,
  options: {
    auth: {
      autoRefreshToken: boolean;
      detectSessionInUrl: boolean;
      persistSession: boolean;
    };
  },
) => any;
type ImporterLog = (message: string) => void;
type CreateOurAirportsImporterOptions = {
  supabaseUrl?: string;
  supabaseKey?: string;
  createClientImpl?: CreateClientImpl;
  fetchImpl?: CsvFetch;
  log?: ImporterLog;
};
type ImportTableOptions = {
  batchSize?: number;
};
type CreateOurAirportsImporterFromEnvOptions = Omit<
  CreateOurAirportsImporterOptions,
  "supabaseUrl" | "supabaseKey"
> & {
  env?: NodeJS.ProcessEnv;
};

const upsertInBatches = async ({
  client,
  table,
  rows,
  onConflict,
  batchSize = DEFAULT_BATCH_SIZE,
}: {
  client: SupabaseUpsertClient;
  table: string;
  rows: unknown[];
  onConflict: string;
  batchSize?: number;
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
] as const);

export const createOurAirportsImporter = ({
  supabaseUrl,
  supabaseKey,
  createClientImpl = createClient as unknown as CreateClientImpl,
  fetchImpl = globalThis.fetch?.bind(globalThis),
  log = () => {},
}: CreateOurAirportsImporterOptions = {}) => {
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

  const importTable = async (
    key: OurAirportsTableKey,
    { batchSize = DEFAULT_BATCH_SIZE }: ImportTableOptions = {},
  ) => {
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
    async import({ batchSize = DEFAULT_BATCH_SIZE }: ImportTableOptions = {}) {
      const counts = {} as OurAirportsImportCounts;
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
}: CreateOurAirportsImporterFromEnvOptions = {}) =>
  createOurAirportsImporter({
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL,
    supabaseKey:
      env.SUPABASE_SERVICE_ROLE_KEY ||
      env.SUPABASE_SECRET_KEY,
    ...rest,
  });
