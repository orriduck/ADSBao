import { reciprocalRunwayIdent } from "./runwayRecordModel";

const SUPPORTED_PATH_TERMINATORS = new Set(["IF", "TF", "DF", "CF"]);

const PROCEDURE_TYPE_LABELS = {
  R: "RNAV (GPS)",
  I: "ILS",
  L: "LOC",
  H: "RNAV (RNP)",
};

const FINAL_TRANSITION_CODES = new Set(["H", "I", "L", "R"]);

const toFiniteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const parseInteger = (value) => {
  const trimmed = String(value || "").trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  return Number(trimmed);
};

const parseCoordinate = (token, degreeLength) => {
  const hemisphere = token[0];
  const digits = token.slice(1);
  const degrees = Number(digits.slice(0, degreeLength));
  const minutes = Number(digits.slice(degreeLength, degreeLength + 2));
  const secondsDigits = digits.slice(degreeLength + 2);
  const seconds =
    Number(secondsDigits) / 10 ** Math.max(secondsDigits.length - 2, 0);
  if (![degrees, minutes, seconds].every(Number.isFinite)) return null;
  const value = degrees + minutes / 60 + seconds / 3600;
  return hemisphere === "S" || hemisphere === "W" ? -value : value;
};

const parseCoordinatePair = (line) => {
  const match = String(line).match(/([NS]\d{8,10})([EW]\d{9,11})/);
  if (!match) return null;
  const lat = parseCoordinate(match[1], 2);
  const lon = parseCoordinate(match[2], 3);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
};

const parseCoordinatePairs = (line) =>
  [...String(line).matchAll(/([NS]\d{8,10})([EW]\d{9,11})/g)]
    .map((match) => {
      const lat = parseCoordinate(match[1], 2);
      const lon = parseCoordinate(match[2], 3);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return { lat, lon };
    })
    .filter(Boolean);

const isAirportLine = (line, airport) =>
  line.startsWith("SUSAP ") && line.slice(6, 10).trim() === airport;

const normalizeProcedureCode = (code) => code.trim().replace(/\s+/g, "");

const procedureRunway = (procedureCode) =>
  procedureCode.slice(1).replace(/[A-Z]$/, (suffix) =>
    ["L", "R", "C"].includes(suffix) ? suffix : "",
  );

const procedureName = (procedureCode) => {
  const kind = procedureCode[0];
  const runway = procedureRunway(procedureCode);
  const label = PROCEDURE_TYPE_LABELS[kind] || `FAA ${kind}`;
  return runway ? `${label} RWY ${runway}` : label;
};

const procedureId = (airport, procedureCode) =>
  `${airport}-${procedureCode}-${procedureName(procedureCode)}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const transitionName = (line, procedureCode) => {
  const transitionIdent = line.slice(20, 25).trim();
  const routeType = line.slice(19, 20).trim();
  const trimmed = transitionIdent || routeType;
  if (!trimmed || trimmed === procedureCode[0] || FINAL_TRANSITION_CODES.has(trimmed)) {
    return "FINAL";
  }
  return trimmed;
};

const parseAltitudeMinFt = (line) => {
  const altitude = parseInteger(line.slice(84, 89));
  return altitude != null && altitude >= 100 ? altitude : undefined;
};

const parseAltitudeMaxFt = (line) => {
  const altitude = parseInteger(line.slice(94, 99));
  return altitude != null && altitude >= 100 ? altitude : undefined;
};

const parseSpeedMaxKt = (line) => {
  const speed = parseInteger(line.slice(99, 102));
  return speed != null && speed > 0 ? speed : undefined;
};

const indexFixes = (lines, airport) => {
  const fixes = new Map();
  for (const line of lines) {
    if (!isAirportLine(line, airport)) continue;
    if (line[12] === "C") {
      const ident = line.slice(13, 18).trim();
      const coords = parseCoordinatePair(line);
      if (ident && coords) fixes.set(ident, { ident, ...coords });
    }
    if (line[12] === "P" && line[13] === "R") {
      const runway = line.slice(19, 24).trim();
      const coords = parseCoordinatePairs(line);
      if (/^RW\d{2}[LRC]?$/.test(runway) && coords[0]) {
        fixes.set(runway, { ident: runway, ...coords[0] });
        const reciprocal = reciprocalRunwayIdent(runway.replace(/^RW/, ""));
        if (reciprocal && coords[1]) {
          fixes.set(`RW${reciprocal}`, {
            ident: `RW${reciprocal}`,
            ...coords[1],
          });
        }
      }
    }
  }
  return fixes;
};

const createProcedure = ({ airport, cycle, procedureCode }) => ({
  id: procedureId(airport, procedureCode),
  procedureCode,
  airport,
  name: procedureName(procedureCode),
  type: "IAP",
  runway: procedureRunway(procedureCode),
  sourceCycle: cycle,
  transitions: [],
});

const getTransition = (procedure, name) => {
  let transition = procedure.transitions.find((item) => item.name === name);
  if (!transition) {
    transition = { name, legs: [] };
    procedure.transitions.push(transition);
  }
  return transition;
};

export function parseProcedureRecords({
  lines,
  airport,
  cycle = "",
  procedureCodes = [],
}) {
  const normalizedAirport = airport.toUpperCase();
  const selectedCodes = new Set(procedureCodes.map(normalizeProcedureCode));
  const fixes = indexFixes(lines, normalizedAirport);
  const proceduresByCode = new Map();
  const warnings = [];

  for (const line of lines) {
    if (!isAirportLine(line, normalizedAirport) || line[12] !== "F") continue;
    const procedureCode = normalizeProcedureCode(line.slice(13, 19));
    if (selectedCodes.size > 0 && !selectedCodes.has(procedureCode)) continue;

    if (!proceduresByCode.has(procedureCode)) {
      proceduresByCode.set(
        procedureCode,
        createProcedure({
          airport: normalizedAirport,
          cycle,
          procedureCode,
        }),
      );
    }

    const procedure = proceduresByCode.get(procedureCode);
    const rawFixIdent = line.slice(29, 34).trim();
    const pathTerminator = line.slice(47, 49).trim();
    if (!pathTerminator) continue;
    const fix = rawFixIdent ? fixes.get(rawFixIdent) : null;
    const unsupported = !SUPPORTED_PATH_TERMINATORS.has(pathTerminator);
    const transition = getTransition(
      procedure,
      transitionName(line, procedureCode),
    );
    const leg = {
      sequence: toFiniteNumber(line.slice(26, 29)) ?? transition.legs.length + 1,
      pathTerminator,
      fixIdent: rawFixIdent || undefined,
      fixLat: fix?.lat,
      fixLon: fix?.lon,
      altitudeMinFt: parseAltitudeMinFt(line),
      altitudeMaxFt: parseAltitudeMaxFt(line),
      speedMaxKt: parseSpeedMaxKt(line),
      unsupported,
      raw: line,
    };

    if (unsupported) {
      warnings.push(
        `${procedure.id}/${transition.name}/${leg.sequence}: unsupported ${pathTerminator || "blank"} leg`,
      );
    }
    if (rawFixIdent && !fix) {
      warnings.push(
        `${procedure.id}/${transition.name}/${leg.sequence}: missing coordinates for ${rawFixIdent}`,
      );
    }

    transition.legs.push(leg);
  }

  return {
    procedures: [...proceduresByCode.values()],
    warnings,
  };
}

const coordinateForLeg = (leg) => {
  if (Number.isFinite(leg.fixLat) && Number.isFinite(leg.fixLon)) {
    return [leg.fixLon, leg.fixLat];
  }
  return null;
};

const compactProperties = (properties) =>
  Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined),
  );

export function renderProcedureGeoJson(procedure) {
  const features = [];
  const warnings = [];

  for (const transition of procedure.transitions) {
    let previous = null;
    let reachedRunway = false;
    for (const leg of transition.legs) {
      const current = coordinateForLeg(leg);
      const isRunwayFix = /^RW\d{2}[LRC]?$/.test(leg.fixIdent || "");
      const baseProperties = compactProperties({
        procedureId: procedure.id,
        procedureName: procedure.name,
        runway: procedure.runway,
        transitionName: transition.name,
        phase: reachedRunway ? "missed" : isRunwayFix ? "runway" : "approach",
        legType: leg.pathTerminator,
        sequence: leg.sequence,
        fixIdent: leg.fixIdent,
        altitudeMinFt: leg.altitudeMinFt,
        altitudeMaxFt: leg.altitudeMaxFt,
        speedMaxKt: leg.speedMaxKt,
        unsupported: leg.unsupported || undefined,
      });

      if (current) {
        features.push({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: current,
          },
          properties: baseProperties,
        });
      }

      if (leg.unsupported) {
        warnings.push(
          `${procedure.id}/${transition.name}/${leg.sequence}: unsupported ${leg.pathTerminator}`,
        );
        continue;
      }

      if (current && previous && ["TF", "DF", "CF"].includes(leg.pathTerminator)) {
        features.push({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [previous, current],
          },
          properties: baseProperties,
        });
      }

      if (current) previous = current;
      if (isRunwayFix) reachedRunway = true;
    }
  }

  return {
    type: "FeatureCollection",
    properties: {
      procedureId: procedure.id,
      airport: procedure.airport,
      name: procedure.name,
      runway: procedure.runway,
      source: "FAA CIFP",
      sourceCycle: procedure.sourceCycle,
      warnings,
    },
    features,
  };
}

export function buildProcedureIndex({ airport, cycle = "", procedures }) {
  return {
    airport: airport.toUpperCase(),
    source: "FAA CIFP",
    cycle,
    approaches: procedures.map((procedure) => {
      const legs = procedure.transitions.flatMap((transition) => transition.legs);
      const unsupportedLegCount = legs.filter((leg) => leg.unsupported).length;
      return {
        id: procedure.id,
        name: procedure.name,
        runway: procedure.runway,
        supportedLegCount: legs.length - unsupportedLegCount,
        unsupportedLegCount,
        warningCount: unsupportedLegCount,
      };
    }),
  };
}
