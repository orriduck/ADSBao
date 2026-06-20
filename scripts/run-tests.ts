import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const ignoredDirs = new Set([
  ".git",
  ".codex-tmp",
  ".next",
  ".playwright-mcp",
  ".ruff_cache",
  "dist",
  "node_modules",
]);

function collectTestFiles(dir) {
  return readdirSync(dir)
    .flatMap((entry) => {
      if (ignoredDirs.has(entry)) return [];

      const path = join(dir, entry);
      const stats = statSync(path);

      if (stats.isDirectory()) return collectTestFiles(path);
      if (
        stats.isFile() &&
        (entry.endsWith(".test.ts") || entry.endsWith(".test.tsx"))
      ) {
        return [path];
      }

      return [];
    })
    .sort();
}

const testFiles = collectTestFiles(rootDir);

if (testFiles.length === 0) {
  console.log("No test files found.");
  process.exit(0);
}

for (const file of testFiles) {
  const displayPath = relative(rootDir, file);
  console.log(`\n[test] ${displayPath}`);

  const result = spawnSync("tsx", [file], {
    cwd: rootDir,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`\n[test] ${testFiles.length} test files passed.`);
