export const MAP_LABEL_LEVEL_IDS = Object.freeze({
  OFF: "off",
  MAJOR_CITIES: "majorCities",
  MAJOR_HIGHWAYS: "majorHighways",
  ALL: "all",
} as const);

export type MapLabelLevel =
  (typeof MAP_LABEL_LEVEL_IDS)[keyof typeof MAP_LABEL_LEVEL_IDS];

export const MAP_LABEL_LEVEL_OPTIONS = Object.freeze([
  MAP_LABEL_LEVEL_IDS.OFF,
  MAP_LABEL_LEVEL_IDS.MAJOR_CITIES,
  MAP_LABEL_LEVEL_IDS.MAJOR_HIGHWAYS,
  MAP_LABEL_LEVEL_IDS.ALL,
]);

const MAP_LABEL_LEVEL_SET = new Set<string>(MAP_LABEL_LEVEL_OPTIONS);

export const DEFAULT_MAP_LABEL_LEVEL = MAP_LABEL_LEVEL_IDS.OFF;

export function isKnownMapLabelLevel(value: unknown): value is MapLabelLevel {
  return typeof value === "string" && MAP_LABEL_LEVEL_SET.has(value);
}

export function normalizeMapLabelLevel(value: unknown): MapLabelLevel {
  return isKnownMapLabelLevel(value) ? value : DEFAULT_MAP_LABEL_LEVEL;
}

export function getMapLabelLevelIndex(value: unknown) {
  const index = MAP_LABEL_LEVEL_OPTIONS.indexOf(normalizeMapLabelLevel(value));
  return index < 0 ? 0 : index;
}

export function getMapLabelLevelAtIndex(value: unknown): MapLabelLevel {
  const numeric = Number(value);
  const index = Number.isFinite(numeric)
    ? Math.max(0, Math.min(MAP_LABEL_LEVEL_OPTIONS.length - 1, Math.round(numeric)))
    : 0;
  return MAP_LABEL_LEVEL_OPTIONS[index];
}
