#!/usr/bin/env node
// Pulls aircraft silhouette SVGs from the ADS-B Radar "Free Aircraft SVG
// Icons" set (https://adsb-radar.com/help/icons.html) into
// `public/icons/aircraft/<name>.svg`. The runtime API route at
// `src/app/api/icons/aircraft/[name]/route.js` serves them from disk and falls
// back to `arrow.svg` if a specific icon is missing, so this script is only
// needed when adding new types or refreshing the set.
//
// Usage:
//   pnpm icons:aircraft               # downloads every known name
//   pnpm icons:aircraft a320 b777     # downloads only the listed names
//
// Run this from a network that can reach adsb-radar.com.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

import { AIRCRAFT_ICON_NAMES } from "../src/utils/aircraftIcon.js";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, "..");
const TARGET_DIR = join(ROOT, "public", "icons", "aircraft");
const UPSTREAM_BASE = "https://adsb-radar.com/help/icons";
const USER_AGENT = "ADSBao/0.9.0 (https://github.com/orriduck/ADSBao)";
const MAX_BYTES = 64 * 1024;

const args = process.argv.slice(2);
const names =
  args.length > 0 ? Array.from(new Set(args)) : [...AIRCRAFT_ICON_NAMES];

if (typeof globalThis.fetch !== "function") {
  console.error("[icons] Node.js >= 18 is required (global fetch).");
  process.exit(1);
}

await mkdir(TARGET_DIR, { recursive: true });

const downloadOne = async (name) => {
  const url = `${UPSTREAM_BASE}/${encodeURIComponent(name)}.svg`;
  const response = await fetch(url, {
    headers: { Accept: "image/svg+xml", "User-Agent": USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const contentType = response.headers.get("content-type") || "";
  if (!/svg/i.test(contentType)) {
    throw new Error(`unexpected content-type: ${contentType}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) {
    throw new Error(`payload too large: ${buffer.byteLength} bytes`);
  }
  await writeFile(join(TARGET_DIR, `${name}.svg`), buffer);
  return buffer.byteLength;
};

let okCount = 0;
let failCount = 0;
const failures = [];

for (const name of names) {
  try {
    const bytes = await downloadOne(name);
    console.log(`[icons] ${name}.svg (${bytes} B)`);
    okCount += 1;
  } catch (error) {
    failCount += 1;
    failures.push({ name, message: error.message });
    console.warn(`[icons] ${name}.svg failed: ${error.message}`);
  }
}

console.log(`[icons] done: ${okCount} saved, ${failCount} failed`);
if (failCount > 0) {
  console.log("[icons] failed names:", failures.map((f) => f.name).join(", "));
  process.exit(1);
}
