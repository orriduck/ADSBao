// Regenerates src/data/airportCities.json — an ICAO → [city, ISO country]
// lookup used to label flight-route endpoints with their served city
// (e.g. KPHL → "Philadelphia, US"). Source: OurAirports `airports.csv`
// (public domain, https://ourairports.com/data/). We keep only airports that
// carry both an IATA code and a municipality (i.e. the commercial airports a
// route can reference), which trims ~85k rows to ~8.7k and ~12MB to ~220KB.
//
// Usage: node scripts/build-airport-cities.mjs
// Output is committed so the app needs no network/DB at runtime.

import { writeFileSync } from "node:fs";

const CSV_URL = "https://davidmegginson.github.io/ourairports-data/airports.csv";
const OUT = new URL("../src/data/airportCities.json", import.meta.url);

// Minimal CSV row parser handling quoted fields with embedded commas/quotes.
function parseLine(line) {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      cells.push(cell);
      cell = "";
    } else {
      cell += ch;
    }
  }
  cells.push(cell);
  return cells;
}

const csv = await fetch(CSV_URL).then((response) => {
  if (!response.ok) throw new Error(`OurAirports CSV HTTP ${response.status}`);
  return response.text();
});

const lines = csv.split(/\r?\n/).filter(Boolean);
const header = parseLine(lines[0]);
const col = (name) => header.indexOf(name);
const idxIdent = col("ident");
const idxIcao = col("icao_code");
const idxIata = col("iata_code");
const idxMunicipality = col("municipality");
const idxCountry = col("iso_country");

const table = {};
for (let i = 1; i < lines.length; i += 1) {
  const row = parseLine(lines[i]);
  const iata = (row[idxIata] || "").trim();
  const municipality = (row[idxMunicipality] || "").trim();
  if (!iata || !municipality) continue;
  const icao = (row[idxIcao] || row[idxIdent] || "").trim().toUpperCase();
  if (!icao) continue;
  table[icao] = [municipality, (row[idxCountry] || "").trim().toUpperCase()];
}

writeFileSync(OUT, JSON.stringify(table));
console.log(`Wrote ${Object.keys(table).length} airports to ${OUT.pathname}`);
