import { createClient } from "@supabase/supabase-js";

import { downloadAndParseDataset } from "./ourAirportsDownloader.js";
import {
  normalizeAirports,
  normalizeFrequencies,
  normalizeNavaids,
  normalizeRunways,
} from "./ourAirportsNormalizer.js";
import { OUR_AIRPORTS_DATASETS } from "./ourAirportsCsvSources.js";

const DEFAULT_BATCH_SIZE = 1000;

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

  const downloadAndNormalize = async () => {
    log("Downloading airports.csv ...");
    const airportsResult = await downloadAndParseDataset(
      OUR_AIRPORTS_DATASETS.airports,
      { fetchImpl },
    );
    log("Downloading runways.csv ...");
    const runwaysResult = await downloadAndParseDataset(
      OUR_AIRPORTS_DATASETS.runways,
      { fetchImpl },
    );
    log("Downloading airport-frequencies.csv ...");
    const frequenciesResult = await downloadAndParseDataset(
      OUR_AIRPORTS_DATASETS.frequencies,
      { fetchImpl },
    );
    log("Downloading navaids.csv ...");
    const navaidsResult = await downloadAndParseDataset(
      OUR_AIRPORTS_DATASETS.navaids,
      { fetchImpl },
    );

    return {
      airports: normalizeAirports(airportsResult.rows),
      runways: normalizeRunways(runwaysResult.rows),
      frequencies: normalizeFrequencies(frequenciesResult.rows),
      navaids: normalizeNavaids(navaidsResult.rows),
    };
  };

  return {
    async import({ batchSize = DEFAULT_BATCH_SIZE } = {}) {
      const data = await downloadAndNormalize();
      log(`Parsed ${data.airports.length} airports`);
      log(`Parsed ${data.runways.length} runways`);
      log(`Parsed ${data.frequencies.length} frequencies`);
      log(`Parsed ${data.navaids.length} navaids`);

      log("Upserting airports ...");
      await upsertInBatches({
        client,
        table: "airports",
        rows: data.airports,
        onConflict: "ident",
        batchSize,
      });

      log("Upserting runways ...");
      await upsertInBatches({
        client,
        table: "runways",
        rows: data.runways,
        onConflict: "id",
        batchSize,
      });

      log("Upserting airport_frequencies ...");
      await upsertInBatches({
        client,
        table: "airport_frequencies",
        rows: data.frequencies,
        onConflict: "id",
        batchSize,
      });

      log("Upserting navaids ...");
      await upsertInBatches({
        client,
        table: "navaids",
        rows: data.navaids,
        onConflict: "id",
        batchSize,
      });

      return {
        airports: data.airports.length,
        runways: data.runways.length,
        frequencies: data.frequencies.length,
        navaids: data.navaids.length,
      };
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
