import { parseProcedureRecords } from "./procedureRecordModel.js";
import { parseRunwayRecords } from "./runwayRecordModel.js";

const PROCEDURE_TYPES = {
  R: "RNAV",
  I: "ILS",
  L: "LOC",
  H: "RNAV_RNP",
};

const compact = (value) =>
  Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  );

const procedureType = (procedureCode) =>
  PROCEDURE_TYPES[String(procedureCode || "")[0]] || "OTHER";

const legPoint = (leg) => {
  if (Number.isFinite(leg.fixLat) && Number.isFinite(leg.fixLon)) {
    return { lat: leg.fixLat, lon: leg.fixLon };
  }
  return undefined;
};

const serializeLeg = (leg, phase) =>
  compact({
    sequence: leg.sequence,
    pathTerminator: leg.pathTerminator,
    fixIdent: leg.fixIdent,
    point: legPoint(leg),
    altitudeMinFt: leg.altitudeMinFt,
    altitudeMaxFt: leg.altitudeMaxFt,
    speedMaxKt: leg.speedMaxKt,
    unsupported: leg.unsupported || undefined,
    phase,
  });

const procedureWarnings = (procedure) =>
  procedure.transitions.flatMap((transition) =>
    transition.legs.flatMap((leg) => {
      const warnings = [];
      if (leg.unsupported) {
        warnings.push(
          `${procedure.id}/${transition.name}/${leg.sequence}: unsupported ${leg.pathTerminator}`,
        );
      }
      if (leg.fixIdent && !Number.isFinite(leg.fixLat)) {
        warnings.push(
          `${procedure.id}/${transition.name}/${leg.sequence}: missing coordinates for ${leg.fixIdent}`,
        );
      }
      return warnings;
    }),
  );

const splitFinalTransition = (legs) => {
  const final = [];
  const missed = [];
  let reachedRunway = false;

  for (const leg of legs) {
    const isRunway = /^RW\d{2}[LRC]?$/.test(leg.fixIdent || "");
    if (reachedRunway) {
      missed.push(serializeLeg(leg, "missed"));
    } else {
      final.push(serializeLeg(leg, isRunway ? "runway" : "final"));
    }
    if (isRunway) reachedRunway = true;
  }

  return { final, missed };
};

const serializeProcedure = (procedure) => {
  const nonFinalTransitions = procedure.transitions.filter(
    (transition) => transition.name !== "FINAL",
  );
  const finalTransition = procedure.transitions.find(
    (transition) => transition.name === "FINAL",
  );
  const { final, missed } = splitFinalTransition(finalTransition?.legs || []);
  const unsupportedLegs = procedure.transitions
    .flatMap((transition) => transition.legs)
    .filter((leg) => leg.unsupported)
    .map((leg) => serializeLeg(leg, "unsupported"));

  return {
    id: procedure.id,
    procedureCode: procedure.procedureCode,
    name: procedure.name,
    type: procedureType(procedure.procedureCode),
    runway: procedure.runway,
    transitions: nonFinalTransitions.map((transition) => ({
      name: transition.name,
      legs: transition.legs.map((leg) => serializeLeg(leg, "transition")),
    })),
    final,
    missed,
    unsupportedLegs,
    warnings: procedureWarnings(procedure),
  };
};

const runwayMetadata = (runwayMap) => {
  const metadata = new Map();
  for (const runway of runwayMap.runways || []) {
    for (const end of runway.ends || []) {
      metadata.set(end.ident, {
        runwayPair: runway.id,
        threshold: {
          lat: end.lat,
          lon: end.lon,
        },
      });
    }
  }
  return metadata;
};

const sortProcedures = (procedures) =>
  procedures.toSorted((left, right) => {
    const byRunway = left.runway.localeCompare(right.runway);
    if (byRunway !== 0) return byRunway;
    return left.procedureCode.localeCompare(right.procedureCode);
  });

export function buildRunwayProcedurePayload({
  lines,
  airport,
  cycle = "",
  maxProcedures,
} = {}) {
  const normalizedAirport = String(airport || "").trim().toUpperCase();
  const { procedures, warnings } = parseProcedureRecords({
    lines,
    airport: normalizedAirport,
    cycle,
  });
  const runwayMap = parseRunwayRecords({
    lines,
    airport: normalizedAirport,
    cycle,
  });
  const sortedProcedures = sortProcedures(procedures);
  const capped =
    Number.isInteger(maxProcedures) && maxProcedures >= 0
      ? sortedProcedures.slice(0, maxProcedures)
      : sortedProcedures;
  const runwayInfo = runwayMetadata(runwayMap);
  const runwayDirections = new Map();

  for (const runway of runwayMap.runways || []) {
    for (const end of runway.ends || []) {
      runwayDirections.set(end.ident, {
        runway: end.ident,
        runwayPair: runway.id,
        threshold: { lat: end.lat, lon: end.lon },
        approaches: [],
      });
    }
  }

  for (const procedure of capped) {
    const info = runwayInfo.get(procedure.runway) || {};
    if (!runwayDirections.has(procedure.runway)) {
      runwayDirections.set(
        procedure.runway,
        compact({
          runway: procedure.runway,
          runwayPair: info.runwayPair,
          threshold: info.threshold,
          approaches: [],
        }),
      );
    }
    runwayDirections.get(procedure.runway).approaches.push(
      serializeProcedure(procedure),
    );
  }

  return {
    airport: normalizedAirport,
    source: "FAA CIFP",
    cycle,
    totalParsedProcedures: procedures.length,
    returnedProcedureCount: capped.length,
    isCapped: capped.length < procedures.length,
    ...(Number.isInteger(maxProcedures) ? { maxProcedures } : {}),
    runwayDirections: [...runwayDirections.values()]
      .filter((runway) => runway.approaches.length > 0)
      .toSorted((left, right) => left.runway.localeCompare(right.runway)),
    warnings,
  };
}
