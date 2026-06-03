type CandidateRecord = Record<string, any>;

type LatLon = {
  lat: number;
  lon: number;
};

type BBox = {
  south: number;
  west: number;
  north: number;
  east: number;
};

const METERS_PER_DEGREE_LATITUDE = 111_320;
const DEFAULT_EXTENSION_METERS = 3_800;
const DEFAULT_LATERAL_BUFFER_METERS = 320;
const DEFAULT_LIMIT = 5;

export const CANDIDATE_WATCHING_SPOT_ATTRIBUTION =
  "© OpenStreetMap contributors";
export const CANDIDATE_WATCHING_SPOT_DISCLAIMER =
  "This is a map-derived candidate only. It may not have a clear view, legal parking, public access, safe access, or good lighting.";

const QUALITY_BY_TAG: Record<string, number> = {
  "tourism:viewpoint": 34,
  "leisure:park": 28,
  "man_made:pier": 26,
  "landuse:recreation_ground": 22,
  "public_transport:platform": 20,
  "public_transport:station": 18,
  "amenity:bench": 17,
  "amenity:parking": 14,
  "highway:footway": 12,
  "highway:path": 12,
  "highway:cycleway": 10,
};

const BLOCKED_ACCESS_VALUES = new Set(["private", "no", "customers"]);
const WALKABLE_HIGHWAYS = new Set(["footway", "path", "cycleway"]);

const toFiniteNumber = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const metersPerDegreeLongitude = (latitude: number) =>
  METERS_PER_DEGREE_LATITUDE * Math.cos((latitude * Math.PI) / 180);

const pointToLocalMeters = (point: LatLon, origin: LatLon) => ({
  x: (point.lon - origin.lon) * metersPerDegreeLongitude(origin.lat),
  y: (point.lat - origin.lat) * METERS_PER_DEGREE_LATITUDE,
});

const localMetersToPoint = (
  point: { x: number; y: number },
  origin: LatLon,
): LatLon => ({
  lat: origin.lat + point.y / METERS_PER_DEGREE_LATITUDE,
  lon: origin.lon + point.x / metersPerDegreeLongitude(origin.lat),
});

const bboxFromPoints = (points: LatLon[]): BBox => ({
  south: Math.min(...points.map((point) => point.lat)),
  west: Math.min(...points.map((point) => point.lon)),
  north: Math.max(...points.map((point) => point.lat)),
  east: Math.max(...points.map((point) => point.lon)),
});

export const unionBBoxes = (bboxes: BBox[]): BBox | null => {
  if (!bboxes.length) return null;
  return {
    south: Math.min(...bboxes.map((bbox) => bbox.south)),
    west: Math.min(...bboxes.map((bbox) => bbox.west)),
    north: Math.max(...bboxes.map((bbox) => bbox.north)),
    east: Math.max(...bboxes.map((bbox) => bbox.east)),
  };
};

const normalizeAirportIcao = (value: unknown) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const candidatePointFromElement = (element: CandidateRecord): LatLon | null => {
  const lat = toFiniteNumber(element?.lat ?? element?.center?.lat);
  const lon = toFiniteNumber(element?.lon ?? element?.center?.lon);
  if (lat == null || lon == null) return null;
  return { lat, lon };
};

const distanceMeters = (left: LatLon, right: LatLon) => {
  const local = pointToLocalMeters(right, left);
  return Math.hypot(local.x, local.y);
};

const candidateCategory = (tags: CandidateRecord = {}) => {
  if (tags.tourism === "viewpoint") return "viewpoint";
  if (tags.leisure === "park") return "park";
  if (tags.man_made === "pier") return "pier";
  if (tags.landuse === "recreation_ground") return "recreation ground";
  if (tags.public_transport) return "public transport";
  if (tags.amenity === "bench") return "bench";
  if (tags.amenity === "parking") return "parking";
  if (WALKABLE_HIGHWAYS.has(String(tags.highway || ""))) return "walkable path";
  return "public map object";
};

const qualityScoreForTags = (tags: CandidateRecord = {}) => {
  const pairs = [
    ["tourism", tags.tourism],
    ["leisure", tags.leisure],
    ["man_made", tags.man_made],
    ["landuse", tags.landuse],
    ["public_transport", tags.public_transport],
    ["amenity", tags.amenity],
    ["highway", tags.highway],
  ];
  return Math.max(
    8,
    ...pairs.map(([key, value]) => QUALITY_BY_TAG[`${key}:${value}`] || 0),
  );
};

const accessPenaltyForTags = (tags: CandidateRecord = {}) => {
  if (tags.access === "yes" || tags.access === "permissive" || tags.access === "public") {
    return 0;
  }
  if (tags.access || tags.parking) return 4;
  return 7;
};

const isExcludedByTags = (tags: CandidateRecord = {}) => {
  const access = String(tags.access || "").toLowerCase();
  if (BLOCKED_ACCESS_VALUES.has(access)) return true;
  if (String(tags.foot || "").toLowerCase() === "no") return true;
  if (String(tags.aeroway || "")) return true;
  if (tags.highway && !WALKABLE_HIGHWAYS.has(String(tags.highway))) return true;
  return false;
};

const runwayEndCorridor = ({
  runwayId,
  end,
  oppositeEnd,
  extensionMeters,
  lateralBufferMeters,
}: {
  runwayId: string;
  end: CandidateRecord;
  oppositeEnd: CandidateRecord;
  extensionMeters: number;
  lateralBufferMeters: number;
}) => {
  const origin = { lat: Number(end.lat), lon: Number(end.lon) };
  const opposite = pointToLocalMeters(
    { lat: Number(oppositeEnd.lat), lon: Number(oppositeEnd.lon) },
    origin,
  );
  const length = Math.hypot(opposite.x, opposite.y);
  if (!Number.isFinite(length) || length <= 0) return null;

  const vector = {
    x: -opposite.x / length,
    y: -opposite.y / length,
  };
  const perpendicular = { x: -vector.y, y: vector.x };
  const nearDistance = Math.min(160, extensionMeters * 0.08);
  const corners = [
    {
      x: vector.x * nearDistance + perpendicular.x * lateralBufferMeters,
      y: vector.y * nearDistance + perpendicular.y * lateralBufferMeters,
    },
    {
      x: vector.x * extensionMeters + perpendicular.x * lateralBufferMeters,
      y: vector.y * extensionMeters + perpendicular.y * lateralBufferMeters,
    },
    {
      x: vector.x * extensionMeters - perpendicular.x * lateralBufferMeters,
      y: vector.y * extensionMeters - perpendicular.y * lateralBufferMeters,
    },
    {
      x: vector.x * nearDistance - perpendicular.x * lateralBufferMeters,
      y: vector.y * nearDistance - perpendicular.y * lateralBufferMeters,
    },
  ].map((point) => localMetersToPoint(point, origin));

  return {
    runwayId,
    end: String(end.ident || ""),
    origin,
    vector,
    extensionMeters,
    lateralBufferMeters,
    polygon: corners,
    bbox: bboxFromPoints(corners),
  };
};

export function buildRunwayExtensionCorridors(
  runwayMap: CandidateRecord,
  {
    extensionMeters = DEFAULT_EXTENSION_METERS,
    lateralBufferMeters = DEFAULT_LATERAL_BUFFER_METERS,
  }: CandidateRecord = {},
) {
  return (runwayMap?.runways || []).flatMap((runway: CandidateRecord) => {
    const ends = (runway?.ends || []).filter(
      (end: CandidateRecord) => Number.isFinite(end?.lat) && Number.isFinite(end?.lon),
    );
    if (ends.length < 2) return [];
    return ends
      .map((end: CandidateRecord, index: number) =>
        runwayEndCorridor({
          runwayId: String(runway.id || ""),
          end,
          oppositeEnd: ends[index === 0 ? 1 : 0],
          extensionMeters,
          lateralBufferMeters,
        }),
      )
      .filter(Boolean);
  });
}

export function buildOverpassQuery(bbox: BBox) {
  const formatted = [
    bbox.south,
    bbox.west,
    bbox.north,
    bbox.east,
  ]
    .map((value) => Number(value).toFixed(6))
    .join(",");

  return `[out:json][timeout:25];
(
  nwr["leisure"="park"](${formatted});
  nwr["amenity"="parking"](${formatted});
  nwr["tourism"="viewpoint"](${formatted});
  nwr["highway"~"^(footway|path|cycleway)$"](${formatted});
  nwr["man_made"="pier"](${formatted});
  nwr["public_transport"~"^(platform|station)$"](${formatted});
  nwr["amenity"="bench"](${formatted});
  nwr["landuse"="recreation_ground"](${formatted});
);
out center tags;`;
}

const scoreAgainstCorridor = (point: LatLon, corridor: CandidateRecord) => {
  const local = pointToLocalMeters(point, corridor.origin);
  const along = local.x * corridor.vector.x + local.y * corridor.vector.y;
  if (along < 0 || along > corridor.extensionMeters) return null;
  const cross = Math.abs(local.x * -corridor.vector.y + local.y * corridor.vector.x);
  if (cross > corridor.lateralBufferMeters) return null;

  const lateralScore = 1 - cross / corridor.lateralBufferMeters;
  const distanceScore = 1 - along / corridor.extensionMeters;
  return {
    runwayId: corridor.runwayId,
    end: corridor.end,
    score: Math.max(0, Math.round((lateralScore * 0.7 + distanceScore * 0.3) * 100) / 100),
    distanceMeters: Math.round(along),
  };
};

export function filterAndScoreCandidateElements({
  airportIcao = "",
  airportCenter,
  runwayMap,
  elements = [],
  limit = DEFAULT_LIMIT,
}: CandidateRecord = {}) {
  const corridors = buildRunwayExtensionCorridors(runwayMap);
  const normalizedAirport = normalizeAirportIcao(airportIcao);
  const spots = [];

  for (const element of elements || []) {
    const tags = element?.tags || {};
    if (isExcludedByTags(tags)) continue;

    const point = candidatePointFromElement(element);
    if (!point) continue;

    const alignment = corridors
      .map((corridor: CandidateRecord) => scoreAgainstCorridor(point, corridor))
      .filter(Boolean)
      .sort((left: CandidateRecord, right: CandidateRecord) => right.score - left.score)[0];
    if (!alignment) continue;

    const centerDistance =
      airportCenter?.lat != null && airportCenter?.lon != null
        ? distanceMeters(point, airportCenter)
        : alignment.distanceMeters;
    const distanceComponent = Math.max(0, 28 - Math.min(centerDistance / 180, 28));
    const alignmentComponent = alignment.score * 38;
    const qualityComponent = qualityScoreForTags(tags);
    const score = Math.max(
      0,
      Math.round(
        (alignmentComponent + distanceComponent + qualityComponent - accessPenaltyForTags(tags)) *
          10,
      ) / 10,
    );
    const category = candidateCategory(tags);

    spots.push({
      id: `osm-${element.type}-${element.id}`,
      name: tags.name ? String(tags.name) : null,
      lat: point.lat,
      lon: point.lon,
      source: "osm",
      sourceObjectId: String(element.id),
      osmType: element.type,
      osmTags: tags,
      category,
      score,
      distanceMeters: Math.round(centerDistance),
      runwayAlignment: {
        runwayId: alignment.runwayId,
        end: alignment.end,
        score: alignment.score,
      },
      reason: `${category} near the extended ${alignment.end || ""} runway alignment at ${normalizedAirport}.`,
      disclaimer: CANDIDATE_WATCHING_SPOT_DISCLAIMER,
    });
  }

  return spots
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.max(1, Math.min(Number(limit) || DEFAULT_LIMIT, 10)));
}

export function buildCandidateWatchingSpotFile({
  airportIcao,
  spots = [],
  generatedAt = new Date().toISOString(),
}: CandidateRecord = {}) {
  return {
    airportIcao: normalizeAirportIcao(airportIcao),
    generatedAt,
    sourceAttribution: CANDIDATE_WATCHING_SPOT_ATTRIBUTION,
    spots,
  };
}
