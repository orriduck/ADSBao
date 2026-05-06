const SILK_STYLES = {
  dark: [
    {
      color: "#64748b",
      weight: 12,
      opacity: 0.065,
      className: "procedure-silk procedure-silk--blur",
    },
    {
      color: "#1f6f9f",
      weight: 5.2,
      opacity: 0.105,
      className: "procedure-silk procedure-silk--body",
    },
    {
      color: "#a8d8f3",
      weight: 1.15,
      opacity: 0.18,
      className: "procedure-silk procedure-silk--thread",
    },
  ],
  light: [
    {
      color: "#94a3b8",
      weight: 12,
      opacity: 0.08,
      className: "procedure-silk procedure-silk--blur",
    },
    {
      color: "#2b6f9f",
      weight: 5.2,
      opacity: 0.12,
      className: "procedure-silk procedure-silk--body",
    },
    {
      color: "#4f9fcf",
      weight: 1.15,
      opacity: 0.18,
      className: "procedure-silk procedure-silk--thread",
    },
  ],
};

const isDisplayLineFeature = (feature) =>
  feature?.geometry?.type === "LineString" &&
  feature?.properties?.transitionName === "FINAL" &&
  feature?.properties?.phase !== "missed";

const CURVE_STEPS_PER_LEG = 12;

const sameCoordinate = (left, right) =>
  Array.isArray(left) &&
  Array.isArray(right) &&
  Math.abs(left[0] - right[0]) < 1e-8 &&
  Math.abs(left[1] - right[1]) < 1e-8;

const catmullRom = (previous, start, end, next, t, axis) =>
  0.5 *
  (2 * start[axis] +
    (-previous[axis] + end[axis]) * t +
    (2 * previous[axis] - 5 * start[axis] + 4 * end[axis] - next[axis]) * t ** 2 +
    (-previous[axis] + 3 * start[axis] - 3 * end[axis] + next[axis]) * t ** 3);

const curveRouteCoordinates = (coordinates, steps = CURVE_STEPS_PER_LEG) => {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return coordinates;
  const curved = [];
  for (let index = 0; index < coordinates.length - 1; index++) {
    const previous = coordinates[index - 1] || coordinates[index];
    const start = coordinates[index];
    const end = coordinates[index + 1];
    const next = coordinates[index + 2] || end;

    for (let step = 0; step < steps; step++) {
      const t = step / steps;
      const splinePoint = [
        catmullRom(previous, start, end, next, t, 0),
        catmullRom(previous, start, end, next, t, 1),
      ];
      curved.push(splinePoint);
    }
  }
  curved.push(coordinates.at(-1));
  return curved;
};

const segmentFadeOpacity = (progress) => Number((0.2 + progress * 0.8).toFixed(3));

const sortBySequence = (left, right) => {
  const leftSequence = Number(left.properties?.sequence);
  const rightSequence = Number(right.properties?.sequence);
  if (Number.isFinite(leftSequence) && Number.isFinite(rightSequence)) {
    return leftSequence - rightSequence;
  }
  if (Number.isFinite(leftSequence)) return -1;
  if (Number.isFinite(rightSequence)) return 1;
  return 0;
};

const buildGradientSegments = (features) => {
  const groups = new Map();
  for (const feature of features) {
    const key = feature.properties?.procedureId || "procedure";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(feature);
  }

  return [...groups.values()].flatMap((group) => {
    const sorted = group.toSorted(sortBySequence);
    const routeCoordinates = [];
    for (const feature of sorted) {
      const [start, end] = feature.geometry?.coordinates || [];
      if (!start || !end) continue;
      if (routeCoordinates.length === 0 || !sameCoordinate(routeCoordinates.at(-1), start)) {
        routeCoordinates.push(start);
      }
      routeCoordinates.push(end);
    }

    const curvedCoordinates = curveRouteCoordinates(routeCoordinates);
    const totalSegments = Math.max(curvedCoordinates.length - 1, 1);

    return curvedCoordinates.slice(0, -1).map((start, segmentIndex) => {
      const end = curvedCoordinates[segmentIndex + 1];
      const sourceFeatureIndex = Math.min(
        Math.floor((segmentIndex / totalSegments) * sorted.length),
        sorted.length - 1,
      );
      const sourceFeature = sorted[sourceFeatureIndex];
      const procedureProgress = segmentIndex / Math.max(totalSegments - 1, 1);
      return {
        ...sourceFeature,
        properties: {
          ...sourceFeature.properties,
          fadeOpacity: segmentFadeOpacity(procedureProgress),
          gradientSegment: segmentIndex,
        },
        geometry: {
          ...sourceFeature.geometry,
          coordinates: [start, end],
        },
      };
    });
  });
};

export function buildProcedureLineCollection(geojson) {
  const features = (geojson?.features || []).filter(isDisplayLineFeature);
  return {
    type: "FeatureCollection",
    properties: geojson?.properties || {},
    features: buildGradientSegments(features),
  };
}

export function getProcedureSilkStyles(theme = "dark") {
  return SILK_STYLES[theme] || SILK_STYLES.dark;
}

export function buildProcedureRenderLayers(geojson, theme = "dark") {
  const lineCollection = buildProcedureLineCollection(geojson);
  return getProcedureSilkStyles(theme).map((style) => ({
    style,
    geojson: {
      ...lineCollection,
      features: lineCollection.features.map((feature) => ({
        ...feature,
        properties: {
          ...feature.properties,
          layerOpacity: Number(
            (style.opacity * (feature.properties?.fadeOpacity ?? 1)).toFixed(4),
          ),
        },
      })),
    },
  }));
}
