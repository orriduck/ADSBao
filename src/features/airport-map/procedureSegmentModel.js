const PROCEDURE_SEGMENT_STYLES = {
  light: {
    color: "#244164",
    weight: 3.8,
    opacity: 0.72,
  },
  dark: {
    color: "#8fb7d6",
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
  return buildProcedureSegmentCollection(runwayProcedures).features
    .map((feature) => {
      const [lon, lat] = feature.geometry.coordinates.at(-1) || [];
      const fixIdent = feature.properties?.fixIdent;
      if (!fixIdent || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        return null;
      }

      return {
        key: [
          feature.properties.procedureCode,
          feature.properties.sequence,
          fixIdent,
          lat,
          lon,
        ].join("-"),
        runway: feature.properties.runway,
        procedureId: feature.properties.procedureId,
        procedureCode: feature.properties.procedureCode,
        phase: feature.properties.phase,
        fixIdent,
        lat,
        lon,
      };
    })
    .filter(Boolean);
}
