// Records raw ADS-B snapshots from the local data-service for offline replay.
//
//   node scripts/record-aircraft-fixtures.mjs [lat] [lon] [distNm] [seconds] [intervalMs]
//
// Defaults target KLAX. Each poll appends one raw snapshot
// ({ now, source, ac:[...] } plus a wall-clock receiveTime) to a capture file.
// A second pass (build-aircraft-fixtures.mjs) slices per-callsign sequences.

import { writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const [
  lat = "33.94",
  lon = "-118.41",
  dist = "40",
  seconds = "240",
  intervalMs = "1000",
] = process.argv.slice(2);

const BASE = process.env.DATA_SERVICE_BASE || "http://localhost:8081";
const url = `${BASE}/api/proxy/aircraft/positions/${lat}/${lon}/${dist}`;
const outPath = resolve(
  __dirname,
  "../src/features/aircraft/positions/__fixtures__/raw-capture.json",
);

const totalMs = Number(seconds) * 1000;
const step = Number(intervalMs);
const snapshots = [];
const start = Date.now();

console.log(`[record] polling ${url} for ${seconds}s @ ${step}ms`);

while (Date.now() - start < totalMs) {
  const tick = Date.now();
  try {
    const res = await fetch(url);
    const json = await res.json();
    snapshots.push({
      receiveTime: Date.now(),
      now: json.now,
      source: json.source,
      ac: (json.ac || []).map((a) => ({
        hex: a.hex,
        flight: typeof a.flight === "string" ? a.flight.trim() : a.flight,
        lat: a.lat,
        lon: a.lon,
        gs: a.gs,
        track: a.track,
        gnd: a.gnd ?? false,
        seen_pos: a.seen_pos,
        seen: a.seen,
        alt_baro: a.alt_baro,
      })),
    });
    if (snapshots.length % 10 === 0) {
      console.log(
        `[record] ${snapshots.length} snapshots, last source=${json.source} ac=${(json.ac || []).length}`,
      );
    }
  } catch (err) {
    console.warn(`[record] poll failed: ${err.message}`);
  }
  const elapsed = Date.now() - tick;
  if (elapsed < step) await new Promise((r) => setTimeout(r, step - elapsed));
}

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, JSON.stringify(snapshots));
console.log(`[record] wrote ${snapshots.length} snapshots -> ${outPath}`);
