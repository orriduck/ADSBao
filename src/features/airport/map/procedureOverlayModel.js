const SILK_STYLES = {
  dark: [
    {
      color: "var(--procedure-silk-blur)",
      weight: 12,
      opacity: 0.085,
      className: "procedure-silk procedure-silk--blur",
    },
    {
      color: "var(--procedure-silk-body)",
      weight: 5.2,
      opacity: 0.16,
      className: "procedure-silk procedure-silk--body",
    },
    {
      color: "var(--procedure-silk-thread)",
      weight: 1.15,
      opacity: 0.32,
      className: "procedure-silk procedure-silk--thread",
    },
  ],
  light: [
    {
      color: "var(--procedure-silk-blur)",
      weight: 12,
      opacity: 0.07,
      className: "procedure-silk procedure-silk--blur",
    },
    {
      color: "var(--procedure-silk-body)",
      weight: 5.2,
      opacity: 0.1,
      className: "procedure-silk procedure-silk--body",
    },
    {
      color: "var(--procedure-silk-thread)",
      weight: 1.15,
      opacity: 0.55,
      className: "procedure-silk procedure-silk--thread",
    },
  ],
};

const isDisplayLineFeature = (feature) =>
  feature?.geometry?.type === "LineString" &&
  feature?.properties?.transitionName === "FINAL" &&
  feature?.properties?.phase !== "missed";

const lerp = (start, end, t) => start + (end - start) * t;

const smoothCoordinates = (coordinates, steps = 8) => {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return coordinates;
  const smoothed = [];
  for (let index = 0; index < coordinates.length - 1; index++) {
    const start = coordinates[index];
    const end = coordinates[index + 1];
    for (let step = 0; step < steps; step++) {
      const t = step / steps;
      smoothed.push([lerp(start[0], end[0], t), lerp(start[1], end[1], t)]);
    }
  }
  smoothed.push(coordinates.at(-1));
  return smoothed;
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
    const groupSize = Math.max(sorted.length, 1);

    return sorted.flatMap((feature, featureIndex) => {
      const coordinates = smoothCoordinates(feature.geometry.coordinates);
      if (!Array.isArray(coordinates) || coordinates.length < 2) return [];

      return coordinates.slice(0, -1).map((start, segmentIndex) => {
        const end = coordinates[segmentIndex + 1];
        const localProgress = segmentIndex / Math.max(coordinates.length - 2, 1);
        const procedureProgress = (featureIndex + localProgress) / groupSize;
        return {
          ...feature,
          properties: {
            ...feature.properties,
            fadeOpacity: segmentFadeOpacity(procedureProgress),
            gradientSegment: segmentIndex,
          },
          geometry: {
            ...feature.geometry,
            coordinates: [start, end],
          },
        };
      });
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
