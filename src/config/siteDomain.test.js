import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const rootDir = process.cwd();
const ignoredDirs = new Set([
  ".git",
  ".next",
  ".playwright-mcp",
  "dist",
  "node_modules",
]);
const scannedExtensions = new Set([".js", ".jsx", ".mjs", ".md", ".json"]);
const legacyDomain = ["adsbao", "vercel", "app"].join(".");

function extensionOf(fileName) {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex === -1 ? "" : fileName.slice(dotIndex);
}

function collectFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    if (ignoredDirs.has(entry)) return [];

    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) return collectFiles(path);
    if (!stats.isFile() || !scannedExtensions.has(extensionOf(entry))) return [];
    return [path];
  });
}

const offenders = collectFiles(rootDir)
  .map((file) => ({
    file,
    content: readFileSync(file, "utf8"),
  }))
  .filter(({ content }) => content.includes(legacyDomain))
  .map(({ file }) => relative(rootDir, file));

assert.deepEqual(offenders, []);

console.log("siteDomain.test.js ok");
