const SILK_STYLES = {
  dark: [
    { color: "#64748b", weight: 9, opacity: 0.1 },
    { color: "#1e5f8f", weight: 4.5, opacity: 0.16 },
    { color: "#9ccff0", weight: 1.4, opacity: 0.28 },
  ],
  light: [
    { color: "#94a3b8", weight: 9, opacity: 0.12 },
    { color: "#2b6f9f", weight: 4.5, opacity: 0.18 },
    { color: "#4f9fcf", weight: 1.4, opacity: 0.24 },
  ],
};

const isDisplayLineFeature = (feature) =>
  feature?.geometry?.type === "LineString" &&
  feature?.properties?.phase !== "missed";

export function buildProcedureLineCollection(geojson) {
  return {
    type: "FeatureCollection",
    properties: geojson?.properties || {},
    features: (geojson?.features || []).filter(isDisplayLineFeature),
  };
}

export function getProcedureSilkStyles(theme = "dark") {
  return SILK_STYLES[theme] || SILK_STYLES.dark;
}
