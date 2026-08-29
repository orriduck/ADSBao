import {
  THREE_OSM_ACCEPTANCE_REPORT_KIND,
  THREE_OSM_ACCEPTANCE_SCHEMA_VERSION,
  evaluateThreeOsmAcceptanceSession,
  isThreeOsmAcceptanceSession,
  type ThreeOsmAcceptanceEvaluation,
  type ThreeOsmAcceptanceSession,
} from "./threeOsmAcceptanceModel";

const NON_CONFIGURED_TILE_SOURCE_IDS = new Set([
  "osm-standard",
  "debug-failure",
  "configured-unavailable",
  "unknown",
]);

type AcceptanceReportRecord = {
  kind?: unknown;
  schemaVersion?: unknown;
  generatedAt?: unknown;
  evaluation?: unknown;
  session?: unknown;
};

export type ThreeOsmAcceptanceReportVerification = {
  valid: boolean;
  accepted: boolean;
  issues: string[];
  requirementFailures: string[];
  evaluation: ThreeOsmAcceptanceEvaluation | null;
  session: ThreeOsmAcceptanceSession | null;
  generatedAt: string | null;
  configuredProvider: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isEvaluation(value: unknown): value is ThreeOsmAcceptanceEvaluation {
  if (!isRecord(value) || !Array.isArray(value.gates)) return false;
  return (
    (value.status === "passed" ||
      value.status === "incomplete" ||
      value.status === "failed") &&
    typeof value.elapsedMs === "number" &&
    Number.isFinite(value.elapsedMs) &&
    value.gates.every(
      (gate) =>
        isRecord(gate) &&
        typeof gate.id === "string" &&
        (gate.status === "pass" ||
          gate.status === "pending" ||
          gate.status === "fail") &&
        typeof gate.evidence === "string",
    )
  );
}

function evaluationsMatch(
  exportedEvaluation: ThreeOsmAcceptanceEvaluation,
  recomputedEvaluation: ThreeOsmAcceptanceEvaluation,
) {
  return (
    exportedEvaluation.status === recomputedEvaluation.status &&
    exportedEvaluation.elapsedMs === recomputedEvaluation.elapsedMs &&
    exportedEvaluation.gates.length === recomputedEvaluation.gates.length &&
    exportedEvaluation.gates.every((gate, index) => {
      const recomputedGate = recomputedEvaluation.gates[index];
      return (
        recomputedGate?.id === gate.id &&
        recomputedGate.status === gate.status &&
        recomputedGate.evidence === gate.evidence
      );
    })
  );
}

export function isConfiguredThreeOsmAcceptanceProvider(
  session: ThreeOsmAcceptanceSession,
) {
  return (
    session.latest.tileSourceConfig === "ready" &&
    (session.latest.tileSourceOrigin === "runtime" ||
      session.latest.tileSourceOrigin === "build") &&
    !NON_CONFIGURED_TILE_SOURCE_IDS.has(session.latest.tileSource)
  );
}

export function verifyThreeOsmAcceptanceReport(
  value: unknown,
  options: {
    expectedRoute?: string;
    requireConfiguredTiles?: boolean;
  } = {},
): ThreeOsmAcceptanceReportVerification {
  const expectedRoute = options.expectedRoute || "/airport/KBOS";
  const issues: string[] = [];
  if (!isRecord(value)) {
    return {
      valid: false,
      accepted: false,
      issues: ["The report root must be a JSON object."],
      requirementFailures: [],
      evaluation: null,
      session: null,
      generatedAt: null,
      configuredProvider: false,
    };
  }

  const report = value as AcceptanceReportRecord;
  const requirementFailures: string[] = [];
  if (report.kind !== THREE_OSM_ACCEPTANCE_REPORT_KIND) {
    issues.push(`Unexpected report kind: ${String(report.kind || "missing")}.`);
  }
  if (report.schemaVersion !== THREE_OSM_ACCEPTANCE_SCHEMA_VERSION) {
    issues.push(
      `Unsupported report schema: ${String(report.schemaVersion || "missing")}.`,
    );
  }

  const generatedAt =
    typeof report.generatedAt === "string" ? report.generatedAt : null;
  const generatedAtMs = generatedAt == null ? NaN : Date.parse(generatedAt);
  if (!Number.isFinite(generatedAtMs)) {
    issues.push("The report generatedAt timestamp is invalid.");
  }

  if (!isThreeOsmAcceptanceSession(report.session)) {
    issues.push("The report session is missing required acceptance fields.");
    return {
      valid: false,
      accepted: false,
      issues,
      requirementFailures,
      evaluation: null,
      session: null,
      generatedAt,
      configuredProvider: false,
    };
  }

  const session = report.session;
  if (session.route !== expectedRoute) {
    issues.push(`Expected route ${expectedRoute}; found ${session.route}.`);
  }
  if (
    Number.isFinite(generatedAtMs) &&
    (generatedAtMs < session.updatedAtMs ||
      generatedAtMs - session.updatedAtMs > 10_000)
  ) {
    issues.push("The generatedAt timestamp does not follow the final sample.");
  }
  if (
    session.thermalAssessedAtMs != null &&
    Number.isFinite(generatedAtMs) &&
    session.thermalAssessedAtMs > generatedAtMs
  ) {
    issues.push("The thermal assessment occurs after report generation.");
  }

  const evaluation = Number.isFinite(generatedAtMs)
    ? evaluateThreeOsmAcceptanceSession(session, generatedAtMs)
    : null;
  if (!isEvaluation(report.evaluation)) {
    issues.push("The exported evaluation is missing or malformed.");
  } else if (evaluation && !evaluationsMatch(report.evaluation, evaluation)) {
    issues.push("The exported evaluation does not match the recomputed gates.");
  }

  const configuredProvider = isConfiguredThreeOsmAcceptanceProvider(session);
  if (options.requireConfiguredTiles && !configuredProvider) {
    requirementFailures.push(
      "Configured-provider evidence is required, but this report used the default or unavailable tile source.",
    );
  }

  const valid = issues.length === 0;
  return {
    valid,
    accepted:
      valid &&
      requirementFailures.length === 0 &&
      evaluation?.status === "passed",
    issues,
    requirementFailures,
    evaluation,
    session,
    generatedAt,
    configuredProvider,
  };
}
