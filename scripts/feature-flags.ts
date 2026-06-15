import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  createUserFeatureFlagsRepositoryFromEnv,
} from "../src/server/dao/userFeatureFlags.dao";
import {
  applyFeatureFlagCommand,
  parseFeatureFlagCommand,
} from "./feature-flags.model";

function loadDotenvFile(path) {
  if (!existsSync(path)) return {};

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        if (separatorIndex < 0) return [line, ""];
        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
        return [key, value];
      }),
  );
}

function buildScriptEnv() {
  return {
    ...loadDotenvFile(resolve(process.cwd(), ".env.local")),
    ...process.env,
  };
}

function printUsage() {
  console.log(`Usage:
  pnpm ff [--env local|preview|production] get <email>
  pnpm ff [--env local|preview|production] set <email> <flag> <on|off>
  pnpm ff [--env local|preview|production] merge <email> '<json-flags>'
  pnpm ff [--env local|preview|production] clear <email> [flag]

Examples:
  pnpm ff set you@example.com flightAwareEnabled on
  pnpm ff --env preview set you@example.com flightAwareEnabled on
  pnpm ff --env production set you@example.com flightAwareEnabled off
  pnpm ff --env preview merge you@example.com '{"flightAwareEnabled":true}'
  pnpm ff clear you@example.com`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    return;
  }

  const repository = createUserFeatureFlagsRepositoryFromEnv({
    env: buildScriptEnv(),
  });
  if (!repository) {
    throw new Error(
      "Postgres feature flag repository is not configured. Check ADSBAO_DATABASE_URL in .env.local.",
    );
  }

  const command = parseFeatureFlagCommand(args);
  const result = await applyFeatureFlagCommand({ command, repository });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
