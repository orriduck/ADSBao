import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createImportDatabaseFromEnv } from "./postgresImport";

const migrationsDir = join(process.cwd(), "database", "migrations");

async function main() {
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  if (files.length === 0) {
    throw new Error(`No SQL migrations found in ${migrationsDir}`);
  }

  const queryClient = createImportDatabaseFromEnv();
  try {
    for (const file of files) {
      const sql = await readFile(join(migrationsDir, file), "utf8");
      console.log(`[migrate:database] Applying ${file}`);
      await queryClient.query(sql);
    }
  } finally {
    await queryClient.dispose?.();
  }

  console.log(`[migrate:database] Done. Applied ${files.length} migration files.`);
}

main().catch((error) => {
  console.error("[migrate:database] failed:", error);
  process.exit(1);
});
