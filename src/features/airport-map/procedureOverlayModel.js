const SILK_STYLES = {
  dark: [
    {
      color: "#64748b",
      weight: 11,
      opacity: 0.05,
      className: "procedure-silk procedure-silk--blur",
    },
    {
      color: "#1e5f8f",
      weight: 5,
      opacity: 0.08,
      className: "procedure-silk procedure-silk--body",
    },
    {
      color: "#9ccff0",
      weight: 1.2,
      opacity: 0.14,
      className: "procedure-silk procedure-silk--thread",
    },
  ],
  light: [
    {
      color: "#94a3b8",
      weight: 11,
      opacity: 0.07,
      className: "procedure-silk procedure-silk--blur",
    },
    {
      color: "#2b6f9f",
      weight: 5,
      opacity: 0.1,
      className: "procedure-silk procedure-silk--body",
    },
    {
      color: "#4f9fcf",
      weight: 1.2,
      opacity: 0.14,
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

const addFadeOpacity = (features) => {
  const groups = new Map();
  for (const feature of features) {
    const key = feature.properties?.procedureId || "procedure";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(feature);
  }

  return features.map((feature) => {
    const group = groups.get(feature.properties?.procedureId || "procedure") || [];
    const sequences = group
      .map((item) => Number(item.properties?.sequence))
      .filter(Number.isFinite);
    const min = Math.min(...sequences);
    const max = Math.max(...sequences);
    const sequence = Number(feature.properties?.sequence);
    const progress =
      Number.isFinite(sequence) && Number.isFinite(min) && Number.isFinite(max) && max > min
        ? (sequence - min) / (max - min)
        : 1;
    return {
      ...feature,
      properties: {
        ...feature.properties,
        fadeOpacity: Number((0.35 + progress * 0.65).toFixed(3)),
      },
      geometry: {
        ...feature.geometry,
        coordinates: smoothCoordinates(feature.geometry.coordinates),
      },
    };
  });
};

export function buildProcedureLineCollection(geojson) {
  const features = (geojson?.features || []).filter(isDisplayLineFeature);
  return {
    type: "FeatureCollection",
    properties: geojson?.properties || {},
    features: addFadeOpacity(features),
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
