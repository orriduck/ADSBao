// Slices the raw KLAX capture into curated per-target fixtures spanning the
// hard cases: slow/taxi (the main failure mode), fast cruise, and source
// switches. Output fixtures are committed so the harness is reproducible.
//
//   node scripts/build-aircraft-fixtures.mjs

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = resolve(__dirname, "../src/features/aircraft/positions/__fixtures__");

const raw = JSON.parse(await readFile(resolve(dir, "raw-capture.json"), "utf8"));

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Group every snapshot observation by hex into a per-target fix sequence. Each
// fix carries a client-clock positionTime = receiveTime - age*1000, so the whole
// fixture lives on one timeline (matches the app's frame clock = Date.now()).
const byHex = new Map();
for (const snap of raw) {
  for (const a of snap.ac || []) {
    const lat = toNum(a.lat);
    const lon = toNum(a.lon);
    if (!a.hex || lat == null || lon == null) continue;
    const ageS = Math.max(0, toNum(a.seen_pos ?? a.seen) ?? 0);
    const positionTime = Math.round(snap.receiveTime - ageS * 1000);
    if (!byHex.has(a.hex)) byHex.set(a.hex, { hex: a.hex, callsign: a.flight || a.hex, fixes: [] });
    byHex.get(a.hex).fixes.push({
      receiveTime: snap.receiveTime,
      positionTime,
      source: snap.source,
      lat,
      lon,
      gs: toNum(a.gs) ?? 0,
      track: toNum(a.track) ?? 0,
      gnd: Boolean(a.gnd),
    });
  }
}

const stats = (t) => {
  const fixes = t.fixes;
  const gsVals = fixes.map((f) => f.gs).sort((x, y) => x - y);
  const medGs = gsVals[Math.floor(gsVals.length / 2)] ?? 0;
  const maxGs = gsVals[gsVals.length - 1] ?? 0;
  const sources = new Set(fixes.map((f) => f.source));
  // count source transitions along the sequence
  let switches = 0;
  for (let i = 1; i < fixes.length; i += 1) {
    if (fixes[i].source !== fixes[i - 1].source) switches += 1;
  }
  const groundFrac = fixes.filter((f) => f.gnd || f.gs < 8).length / fixes.length;
  return { medGs, maxGs, sources: sources.size, switches, groundFrac, n: fixes.length };
};

const targets = [...byHex.values()]
  .map((t) => ({ ...t, ...stats(t) }))
  .filter((t) => t.n >= 30); // long-lived enough to replay

const pick = (filter, sortKey, n) =>
  targets
    .filter(filter)
    .sort((a, b) => sortKey(b) - sortKey(a))
    .slice(0, n);

const slow = pick((t) => t.groundFrac > 0.5 && t.medGs < 15, (t) => t.n, 3);
const fast = pick((t) => t.medGs > 250, (t) => t.medGs, 3);
const switchy = pick((t) => t.switches >= 4, (t) => t.switches, 2);

const chosen = new Map();
const tag = (list, category) => {
  for (const t of list) {
    if (chosen.has(t.hex)) continue;
    chosen.set(t.hex, { ...t, category });
  }
};
tag(slow, "slow");
tag(fast, "fast");
tag(switchy, "source-switch");

const manifest = [];
for (const t of chosen.values()) {
  const name = `${t.category}-${t.hex}`;
  const fixture = {
    hex: t.hex,
    callsign: t.callsign,
    category: t.category,
    medGs: Math.round(t.medGs),
    maxGs: Math.round(t.maxGs),
    sourceCount: t.sources,
    sourceSwitches: t.switches,
    fixes: t.fixes,
  };
  await writeFile(resolve(dir, `${name}.json`), JSON.stringify(fixture));
  manifest.push({
    name,
    hex: t.hex,
    callsign: t.callsign.trim(),
    category: t.category,
    medGs: Math.round(t.medGs),
    maxGs: Math.round(t.maxGs),
    fixes: t.fixes.length,
    sourceSwitches: t.switches,
  });
}

await writeFile(resolve(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.table(manifest);
console.log(`[build] wrote ${manifest.length} fixtures -> ${dir}`);
