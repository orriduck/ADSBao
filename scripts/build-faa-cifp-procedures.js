#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  buildProcedureIndex,
  parseFaaCifpProcedures,
  renderProcedureGeoJson,
} from "../src/services/procedures/faaCifpProcedureModel.js";

const DEFAULT_OUTPUT = "public/data/procedures";

const parseArgs = (argv) => {
  const args = {
    airport: "KBOS",
    country: "US",
    output: DEFAULT_OUTPUT,
    procedureCodes: [],
  };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--input") {
      args.input = next;
      index++;
    } else if (arg === "--airport") {
      args.airport = next;
      index++;
    } else if (arg === "--country") {
      args.country = next;
      index++;
    } else if (arg === "--cycle") {
      args.cycle = next;
      index++;
    } else if (arg === "--output") {
      args.output = next;
      index++;
    } else if (arg === "--procedure") {
      args.procedureCodes.push(next);
      index++;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
};

const usage = () => `Usage:
  node scripts/build-faa-cifp-procedures.js --input ./data/raw/FAACIFP18 --airport KBOS --procedure R04R --cycle 260514

Options:
  --input       Path to FAACIFP18, a directory containing FAACIFP18, or a CIFP zip
  --airport     ICAO airport id, defaults to KBOS
  --procedure   FAA CIFP procedure code to include, repeatable; omit to emit all approaches
  --cycle       FAA cycle id to write into generated metadata
  --country     Output country folder, defaults to US
  --output      Output root, defaults to public/data/procedures
`;

const inferCycle = (inputPath) => {
  const match = path.basename(inputPath || "").match(/(?:CIFP[_-]?|^)(\d{6})/i);
  return match?.[1] || "";
};

const readCifpInput = (inputPath) => {
  if (!inputPath) throw new Error("--input is required");
  const resolved = path.resolve(inputPath);
  const stat = fs.statSync(resolved);

  if (stat.isDirectory()) {
    return fs.readFileSync(path.join(resolved, "FAACIFP18"), "utf8");
  }

  if (/\.zip$/i.test(resolved)) {
    return execFileSync("unzip", ["-p", resolved, "FAACIFP18"], {
      encoding: "utf8",
      maxBuffer: 80 * 1024 * 1024,
    });
  }

  return fs.readFileSync(resolved, "utf8");
};

const writeJson = (filePath, payload) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
};

const main = () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const airport = args.airport.toUpperCase();
  const cycle = args.cycle || inferCycle(args.input);
  const lines = readCifpInput(args.input).split(/\r?\n/).filter(Boolean);
  const { procedures, warnings } = parseFaaCifpProcedures({
    lines,
    airport,
    cycle,
    procedureCodes: args.procedureCodes,
  });

  if (procedures.length === 0) {
    throw new Error(`No procedures generated for ${airport}`);
  }

  const outputRoot = path.resolve(args.output, args.country, airport);
  const approachesDir = path.join(outputRoot, "approaches");
  for (const procedure of procedures) {
    const geojson = renderProcedureGeoJson(procedure);
    writeJson(path.join(approachesDir, `${procedure.id}.geojson`), geojson);
  }
  writeJson(
    path.join(outputRoot, "index.json"),
    buildProcedureIndex({ airport, cycle, procedures }),
  );

  for (const warning of warnings) {
    console.warn(`[cifp] ${warning}`);
  }
  console.log(
    `[cifp] wrote ${procedures.length} ${airport} procedure(s) to ${outputRoot}`,
  );
};

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
