import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { verifyThreeOsmAcceptanceReport } from "../src/features/airport/map/threeOsmAcceptanceReportModel";

const MAX_REPORT_BYTES = 1_000_000;

function printUsage() {
  console.log(`Usage:
  pnpm debug:device:report -- <report.json>
  pnpm debug:device:report:configured -- <report.json>`);
}

function parseOptions(args: string[]) {
  let requireConfiguredTiles = false;
  let reportPath = "";
  for (const arg of args) {
    if (arg === "--") continue;
    if (arg === "--configured-tiles") {
      requireConfiguredTiles = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
    if (arg.startsWith("-")) throw new Error(`Unknown argument: ${arg}`);
    if (reportPath) throw new Error("Provide exactly one acceptance report.");
    reportPath = resolve(arg);
  }
  if (!reportPath) throw new Error("Provide an exported acceptance report path.");
  return { reportPath, requireConfiguredTiles };
}

function main() {
  const options = parseOptions(process.argv.slice(2));
  const size = statSync(options.reportPath).size;
  if (size > MAX_REPORT_BYTES) {
    throw new Error(`Acceptance report exceeds ${MAX_REPORT_BYTES} bytes.`);
  }
  const report = JSON.parse(readFileSync(options.reportPath, "utf8"));
  const verification = verifyThreeOsmAcceptanceReport(report, {
    expectedRoute: "/airport/KBOS",
    requireConfiguredTiles: options.requireConfiguredTiles,
  });

  console.log("ADSBao Three+OSM acceptance report");
  console.log(`- file: ${options.reportPath}`);
  console.log(`- integrity: ${verification.valid ? "valid" : "invalid"}`);
  console.log(`- acceptance: ${verification.evaluation?.status || "unavailable"}`);
  if (verification.session) {
    console.log(`- route: ${verification.session.route}`);
    console.log(
      `- provider: ${verification.session.latest.tileSource}/${verification.session.latest.tileSourceOrigin} (${verification.session.latest.tileSourceConfig})`,
    );
    console.log(
      `- configured provider: ${verification.configuredProvider ? "yes" : "no"}${options.requireConfiguredTiles ? " (required)" : ""}`,
    );
    console.log(
      `- screen awake helper: ${verification.session.wakeLock.latestStatus}; active samples=${verification.session.wakeLock.activeSamples}; error samples=${verification.session.wakeLock.errorSamples} (not a gate)`,
    );
    console.log(
      `- traffic capacity: rendered=${verification.session.trafficRenderedMax}; real=${verification.session.trafficRealMax}; synthetic=${verification.session.trafficSyntheticMax}; target=${verification.session.trafficStressTargetMax}; simultaneous samples=${verification.session.trafficCapacitySamples}; full-overlay capacity=${verification.session.fullOperationalTrafficCapacitySamples} (render-stability evidence)`,
    );
    console.log(
      `- route workload transitions: observed=${verification.session.routeWorkloadTransitionsMax}; applied=${verification.session.routeWorkloadAppliedTransitionsMax}; ready=${verification.session.routeWorkloadReadyTransitionsMax}; baseline=${verification.session.routeWorkloadInitialRevision ?? "unset"} (runtime-continuity evidence)`,
    );
  }
  if (verification.evaluation) {
    console.log("");
    for (const gate of verification.evaluation.gates) {
      console.log(
        `${gate.status.padEnd(7)} ${gate.id.padEnd(20)} ${gate.evidence}`,
      );
    }
  }
  if (verification.issues.length > 0) {
    console.log("");
    for (const issue of verification.issues) console.log(`issue   ${issue}`);
  }
  if (verification.requirementFailures.length > 0) {
    console.log("");
    for (const failure of verification.requirementFailures) {
      console.log(`require ${failure}`);
    }
  }

  if (!verification.accepted) process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}
