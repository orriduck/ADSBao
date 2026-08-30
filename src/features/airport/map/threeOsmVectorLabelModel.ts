export type ThreeOsmVectorLabelKind =
  | "aerodrome"
  | "place"
  | "road"
  | "water";

export type ThreeOsmVectorLabelCandidate = {
  id: string;
  text: string;
  kind: ThreeOsmVectorLabelKind;
  className: string;
  rank?: number | null;
  x: number;
  z: number;
};

export type ThreeOsmVectorLabel = ThreeOsmVectorLabelCandidate & {
  priority: number;
};

export const THREE_OSM_VECTOR_LABEL_MAX = 48;

const KIND_LIMITS: Record<ThreeOsmVectorLabelKind, number> = {
  aerodrome: 6,
  place: 14,
  road: 22,
  water: 6,
};

const PLACE_MIN_ZOOM: Record<string, number> = {
  country: 10,
  state: 10,
  city: 10,
  town: 10,
  village: 11,
  hamlet: 12,
  suburb: 13,
  quarter: 13,
  neighbourhood: 13,
  island: 13,
};

const ROAD_MIN_ZOOM: Record<string, number> = {
  motorway: 10,
  trunk: 10,
  primary: 11,
  secondary: 12,
  tertiary: 13,
  minor: 14,
};

const PLACE_PRIORITY: Record<string, number> = {
  country: 370,
  state: 360,
  city: 350,
  town: 340,
  village: 330,
  hamlet: 320,
  suburb: 295,
  quarter: 290,
  neighbourhood: 285,
  island: 270,
};

const ROAD_PRIORITY: Record<string, number> = {
  motorway: 325,
  trunk: 315,
  primary: 305,
  secondary: 280,
  tertiary: 250,
  minor: 220,
};

function finiteRank(value: unknown) {
  const rank = Number(value);
  return Number.isFinite(rank) && rank > 0 ? rank : 0;
}

function normalizedClass(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function truncateLabel(value: string, maximumCharacters: number) {
  const characters = Array.from(value);
  if (characters.length <= maximumCharacters) return value;
  return `${characters
    .slice(0, maximumCharacters - 1)
    .join("")
    .trimEnd()}…`;
}

function localizedName(
  properties: Record<string, unknown>,
  locale: string,
) {
  const normalizedLocale = String(locale || "en").trim().toLowerCase();
  const language = normalizedLocale.split("-")[0] || "en";
  const languageKeys =
    language === "zh"
      ? normalizedLocale.includes("tw") || normalizedLocale.includes("hant")
        ? ["name:zh-Hant", "name:zh", "name_zh"]
        : ["name:zh-Hans", "name:zh", "name_zh"]
      : [`name:${language}`, `name_${language}`];
  for (const key of [...languageKeys, "name", "name_en"]) {
    const value = String(properties[key] || "").trim().replace(/\s+/g, " ");
    if (value) return value;
  }
  return "";
}

export function resolveThreeOsmVectorLabelText({
  properties,
  kind,
  locale,
}: {
  properties: Record<string, unknown>;
  kind: ThreeOsmVectorLabelKind;
  locale: string;
}) {
  if (kind === "aerodrome") {
    const code = String(properties.iata || properties.icao || "")
      .trim()
      .toUpperCase();
    if (code) return truncateLabel(code, 8);
  }
  const className = normalizedClass(properties.class);
  const roadReference = String(properties.ref || "").trim().toUpperCase();
  const name = localizedName(properties, locale);
  const value =
    kind === "road" && className === "motorway"
      ? roadReference || name
      : name || (kind === "road" ? roadReference : "");
  if (!value) return "";
  return truncateLabel(
    value,
    kind === "aerodrome" ? 8 : kind === "road" ? 32 : 30,
  );
}

export function isThreeOsmVectorLabelClassVisible({
  kind,
  className,
  sourceZoom,
}: {
  kind: ThreeOsmVectorLabelKind;
  className: string;
  sourceZoom: number;
}) {
  if (kind === "aerodrome") return sourceZoom >= 10;
  if (kind === "water") return sourceZoom >= 12;
  const normalized = normalizedClass(className);
  const minimumZoom =
    kind === "place" ? PLACE_MIN_ZOOM[normalized] : ROAD_MIN_ZOOM[normalized];
  return minimumZoom != null && sourceZoom >= minimumZoom;
}

export function resolveThreeOsmVectorLabelPriority(
  candidate: ThreeOsmVectorLabelCandidate,
  focus: { x: number; z: number } = { x: 0, z: 0 },
) {
  const className = normalizedClass(candidate.className);
  const base =
    candidate.kind === "aerodrome"
      ? 365
      : candidate.kind === "place"
        ? PLACE_PRIORITY[className] || 260
        : candidate.kind === "road"
          ? ROAD_PRIORITY[className] || 200
          : 235;
  const rankPenalty = Math.min(40, finiteRank(candidate.rank)) * 0.5;
  const distancePenalty = Math.min(
    24,
    Math.hypot(candidate.x - focus.x, candidate.z - focus.z) / 32,
  );
  return base - rankPenalty - distancePenalty;
}

export function selectThreeOsmVectorLabels(
  candidates: ThreeOsmVectorLabelCandidate[],
  {
    sourceZoom,
    maxLabels = THREE_OSM_VECTOR_LABEL_MAX,
    focusX = 0,
    focusZ = 0,
  }: {
    sourceZoom: number;
    maxLabels?: number;
    focusX?: number;
    focusZ?: number;
  },
) {
  const safeMaximum = Math.max(
    0,
    Math.min(THREE_OSM_VECTOR_LABEL_MAX, Math.trunc(maxLabels)),
  );
  const counts: Record<ThreeOsmVectorLabelKind, number> = {
    aerodrome: 0,
    place: 0,
    road: 0,
    water: 0,
  };
  const seen = new Set<string>();
  const selected: ThreeOsmVectorLabel[] = [];
  const sorted = candidates
    .filter(
      (candidate) =>
        candidate.text &&
        Number.isFinite(candidate.x) &&
        Number.isFinite(candidate.z) &&
        isThreeOsmVectorLabelClassVisible({
          kind: candidate.kind,
          className: candidate.className,
          sourceZoom,
        }),
    )
    .map((candidate) => ({
      ...candidate,
      priority: resolveThreeOsmVectorLabelPriority(candidate, {
        x: focusX,
        z: focusZ,
      }),
    }))
    .sort(
      (left, right) =>
        right.priority - left.priority ||
        Math.hypot(left.x - focusX, left.z - focusZ) -
          Math.hypot(right.x - focusX, right.z - focusZ) ||
        left.id.localeCompare(right.id),
    );

  for (const candidate of sorted) {
    if (selected.length >= safeMaximum) break;
    if (counts[candidate.kind] >= KIND_LIMITS[candidate.kind]) continue;
    const key = `${candidate.kind}:${candidate.text.toLocaleLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    counts[candidate.kind] += 1;
    selected.push(candidate);
  }
  return selected;
}
