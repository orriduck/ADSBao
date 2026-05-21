// Endfield palette — warm amber on dark, ink on light. No blues.
const PROCEDURE_SEGMENT_STYLES = {
  light: {
    color: "#1a1a18",
    weight: 3.8,
    opacity: 0.55,
  },
  dark: {
    color: "#d8bd83",
    weight: 4.2,
    opacity: 0.78,
  },
};

const displayLegs = (procedure) => [
  ...(procedure.transitions || []).flatMap((transition) =>
    (transition.legs || []).map((leg) => ({
      ...leg,
      transitionName: transition.name,
      phase: leg.phase || "transition",
    })),
  ),
  ...(procedure.final || []).map((leg) => ({
    ...leg,
    transitionName: "FINAL",
    phase: leg.phase || "final",
  })),
  ...(procedure.missed || []).map((leg) => ({
    ...leg,
    transitionName: "MISSED",
    phase: leg.phase || "missed",
  })),
];

const coordinateForLeg = (leg) => {
  if (Number.isFinite(leg?.point?.lat) && Number.isFinite(leg?.point?.lon)) {
    return [leg.point.lon, leg.point.lat];
  }
  return null;
};

const isRunwayFix = (fixIdent) => /^RW\d{2}[LRC]?$/.test(fixIdent || "");

const procedurePointLegs = (procedure) => [
  ...(procedure.transitions || []).flatMap((transition) =>
    (transition.legs || []).map((leg) => ({
      ...leg,
      transitionName: transition.name,
      phase: leg.phase || "transition",
    })),
  ),
  ...(procedure.final || []).map((leg) => ({
    ...leg,
    transitionName: "FINAL",
    phase: leg.phase || "final",
  })),
  ...(procedure.missed || []).map((leg) => ({
    ...leg,
    transitionName: "MISSED",
    phase: leg.phase || "missed",
  })),
];

const segmentOpacity = (index, total) => {
  if (total <= 1) return 0.9;
  return Number((0.34 + (index / (total - 1)) * 0.56).toFixed(2));
};

const buildProcedureSegments = ({ runwayDirection, procedure }) => {
  const segments = [];
  let previous = null;
  const legs = displayLegs(procedure);

  for (const leg of legs) {
    const current = coordinateForLeg(leg);
    if (current && previous && !leg.unsupported) {
      segments.push({
        runway: runwayDirection.runway,
        runwayPair: runwayDirection.runwayPair,
        procedure,
        leg,
        coordinates: [previous, current],
      });
    }
    if (current) previous = current;
  }

  return segments.map((segment, index) => ({
    ...segment,
    segmentOpacity: segmentOpacity(index, segments.length),
  }));
};

export const getProcedureSegmentStyle = (theme = "dark") =>
  PROCEDURE_SEGMENT_STYLES[theme] || PROCEDURE_SEGMENT_STYLES.dark;

export function buildProcedureSegmentCollection(runwayProcedures) {
  const rawSegments = [];

  for (const runwayDirection of runwayProcedures?.runwayDirections || []) {
    for (const procedure of runwayDirection.approaches || []) {
      rawSegments.push(...buildProcedureSegments({ runwayDirection, procedure }));
    }
  }

  return {
    type: "FeatureCollection",
    properties: {
      airport: runwayProcedures?.airport || "",
      source: runwayProcedures?.source || "FAA CIFP",
      cycle: runwayProcedures?.cycle || "",
      opacityDirection: "toward-runway",
    },
    features: rawSegments.map((segment, index) => ({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: segment.coordinates,
      },
      properties: {
        runway: segment.runway,
        runwayPair: segment.runwayPair,
        procedureId: segment.procedure.id,
        procedureCode: segment.procedure.procedureCode,
        procedureName: segment.procedure.name,
        transitionName: segment.leg.transitionName,
        phase: segment.leg.phase,
        pathTerminator: segment.leg.pathTerminator,
        sequence: segment.leg.sequence,
        fixIdent: segment.leg.fixIdent,
        segmentIndex: index,
        segmentOpacity: segment.segmentOpacity,
      },
    })),
  };
}

export function buildProcedureFixLabels(runwayProcedures) {
  const labelsByPoint = new Map();

  for (const runwayDirection of runwayProcedures?.runwayDirections || []) {
    for (const procedure of runwayDirection.approaches || []) {
      for (const leg of procedurePointLegs(procedure)) {
        const [lon, lat] = coordinateForLeg(leg) || [];
        const fixIdent = leg.fixIdent;
        if (
          !fixIdent ||
          isRunwayFix(fixIdent) ||
          !Number.isFinite(lat) ||
          !Number.isFinite(lon)
        ) {
          continue;
        }

        const key = [
          fixIdent,
          lat.toFixed(6),
          lon.toFixed(6),
        ].join("-");
        if (!labelsByPoint.has(key)) {
          labelsByPoint.set(key, {
            key,
            runway: runwayDirection.runway,
            procedureId: procedure.id,
            procedureCode: procedure.procedureCode,
            phase: leg.phase,
            fixIdent,
            lat,
            lon,
          });
        }
      }
    }
  }

  return [...labelsByPoint.values()];
}
