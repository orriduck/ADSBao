#!/usr/bin/env node
import process from "node:process";

import { createOurAirportsImporterFromEnv } from "../src/features/airport/directory/ourairports/ourAirportsImporter";

const main = async () => {
  if (typeof globalThis.fetch !== "function") {
    console.error(
      "[import-ourairports] global fetch is unavailable. Use Node.js >= 18.",
    );
    process.exit(1);
  }

  const env = process.env;
  if (!env.NEXT_PUBLIC_SUPABASE_URL && !env.SUPABASE_URL) {
    console.error(
      "[import-ourairports] NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) is required.",
    );
    process.exit(1);
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY && !env.SUPABASE_SECRET_KEY) {
    console.error(
      "[import-ourairports] SUPABASE_SERVICE_ROLE_KEY is required. Get it from\n" +
        "Supabase dashboard -> Project settings -> API -> service_role (secret).",
    );
    process.exit(1);
  }

  const startedAt = Date.now();
  const importer = createOurAirportsImporterFromEnv({
    log: (message) => console.log(`[import-ourairports] ${message}`),
  });

  const counts = await importer.import();
  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);

  console.log(`[import-ourairports] Done in ${elapsedSec}s`);
  console.log(`[import-ourairports] airports:    ${counts.airports}`);
  console.log(`[import-ourairports] runways:     ${counts.runways}`);
  console.log(`[import-ourairports] frequencies: ${counts.frequencies}`);
  console.log(`[import-ourairports] navaids:     ${counts.navaids}`);
};

main().catch((error) => {
  console.error("[import-ourairports] failed:", error);
  process.exit(1);
});
