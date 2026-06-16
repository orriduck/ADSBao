import { RUNWAY_APPROACH_BEAM_CONFIG } from "../../../config/airportMap";
import { ZOOM_APPROACH } from "../../../utils/airportMapDisplay";
import { shouldShowRunwayEndLabelsForZoom } from "./airportMapZoomFeatures";

const METERS_PER_DEGREE_LATITUDE = 111_320;
const STATUTE_MILE_METERS = 1_609.344;
const FEET_TO_METERS = 0.3048;
const RUNWAY_LIGHT_SPACING_METERS = 170;
const RUNWAY_CENTERLINE_LIGHT_SPACING_METERS = 260;
const RUNWAY_APPROACH_LIGHT_SPACING_METERS = 180;
const MIN_RUNWAY_APPROACH_LIGHT_DISTANCE_METERS = 260;
const MAX_RUNWAY_APPROACH_LIGHT_DISTANCE_METERS = 900;
const DEFAULT_RUNWAY_WIDTH_METERS = 45;
const MIN_RUNWAY_LIGHT_WIDTH_METERS = 18;
const MAX_RUNWAY_LIGHT_WIDTH_METERS = 80;
const RUNWAY_SEGMENT_JOIN_TOLERANCE_METERS = 45;
const INVALID_SURFACE_RUNWAY_IDS = new Set([
  "",
  "<NIL>",
  "NIL",
  "NULL",
  "UNDEFINED",
]);

const shouldShowRunwayEndLabels = shouldShowRunwayEndLabelsForZoom;

type RunwayAnnotationRecord = Record<string, any>;
type Coordinate2D = [number, number];
type SurfaceRunwaySegment = {
  feature: RunwayAnnotationRecord;
  coordinates: Coordinate2D[];
  firstIndex: number;
  lengthMeters: number;
};
type SurfaceRunwayEntry = RunwayAnnotationRecord & {
  id: string;
  firstIndex: number;
  features: RunwayAnnotationRecord[];
  segments: SurfaceRunwaySegment[];
  lengthMeters: number;
};
type CanonicalSurfaceRunwayFeature = RunwayAnnotationRecord & {
  id: string;
  firstIndex: number;
  feature: {
    geometry: {
      type: string;
      coordinates: Coordinate2D[];
    };
    properties: RunwayAnnotationRecord;
  };
  features: RunwayAnnotationRecord[];
  segments: SurfaceRunwaySegment[];
  coordinates: Coordinate2D[];
  referenceRunway: RunwayAnnotationRecord | null;
  lengthMeters: number;
};

const metersPerDegreeLongitude = (latitude: number) =>
  METERS_PER_DEGREE_LATITUDE * Math.cos((latitude * Math.PI) / 180);

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const interpolate = (from: number, to: number, progress: number) => from + (to - from) * progress;

const isCoordinate2D = (value: unknown): value is Coordinate2D =>
  Array.isArray(value) &&
  Number.isFinite(value[0]) &&
  Number.isFinite(value[1]);

const normalizedRunwayEndIdent = (value: unknown) => {
  const text = String(value || "").trim().toUpperCase();
  const match = text.match(/^0?([1-9]|[12]\d|3[0-6])([LRC]?)$/);
  if (!match) return text;
  return `${match[1].padStart(2, "0")}${match[2] || ""}`;
};

const normalizedSurfaceRunwayId = (value: unknown) => {
  const raw = String(value || "").trim().toUpperCase();
  const normalized = raw
    .split("/")
    .map((part) => normalizedRunwayEndIdent(part))
    .filter(Boolean)
    .join("/");
  if (INVALID_SURFACE_RUNWAY_IDS.has(normalized)) return null;
  return normalized || null;
};

const runwayIdFromEnds = (runway: RunwayAnnotationRecord) => {
  const ends = (runway?.ends || [])
    .map((end: RunwayAnnotationRecord) => normalizedRunwayEndIdent(end?.ident))
    .filter(Boolean);
  return ends.length >= 2 ? ends.slice(0, 2).join("/") : "";
};

const normalizedRunwayMapById = (runwayMap: RunwayAnnotationRecord) => {
  const byId = new Map<string, RunwayAnnotationRecord>();
  for (const runway of runwayMap?.runways || []) {
    const id = normalizedSurfaceRunwayId(runway?.id) || runwayIdFromEnds(runway);
    if (!id || byId.has(id)) continue;
    byId.set(id, runway);
  }
  return byId;
};

const metersBetweenCoordinates = (left: Coordinate2D, right: Coordinate2D) => {
  const lonMeters = metersPerDegreeLongitude((left[1] + right[1]) / 2);
  const dx = (right[0] - left[0]) * lonMeters;
  const dy = (right[1] - left[1]) * METERS_PER_DEGREE_LATITUDE;
  return Math.hypot(dx, dy);
};

const runwaySurfaceId = (feature: RunwayAnnotationRecord, _index: number) => {
  const properties = feature?.properties || {};
  for (const value of [properties.ref, properties.name]) {
    if (value == null) continue;
    const text = String(value).trim();
    if (!text) continue;
    const rawId = normalizedSurfaceRunwayId(text);
    if (rawId) return rawId;
  }

  return null;
};

const lineLengthMeters = (coordinates: Coordinate2D[]) =>
  coordinates.reduce((total, coordinate, index) => {
    if (index === 0) return total;
    const previous = coordinates[index - 1];
    const lonMeters = metersPerDegreeLongitude((previous[1] + coordinate[1]) / 2);
    const dx = (coordinate[0] - previous[0]) * lonMeters;
    const dy = (coordinate[1] - previous[1]) * METERS_PER_DEGREE_LATITUDE;
    return total + Math.hypot(dx, dy);
  }, 0);

const closestSegmentEndpointDistance = (
  left: SurfaceRunwaySegment,
  right: SurfaceRunwaySegment,
) => {
  const leftStart = left.coordinates[0];
  const leftEnd = left.coordinates.at(-1);
  const rightStart = right.coordinates[0];
  const rightEnd = right.coordinates.at(-1);
  if (!leftStart || !leftEnd || !rightStart || !rightEnd) return Infinity;

  return Math.min(
    metersBetweenCoordinates(leftStart, rightStart),
    metersBetweenCoordinates(leftStart, rightEnd),
    metersBetweenCoordinates(leftEnd, rightStart),
    metersBetweenCoordinates(leftEnd, rightEnd),
  );
};

const addSegmentToRunwayEntry = (
  entry: SurfaceRunwayEntry,
  segment: SurfaceRunwaySegment,
) => {
  entry.features.push(segment.feature);
  entry.segments.push(segment);
  entry.firstIndex = Math.min(entry.firstIndex, segment.firstIndex);
  entry.lengthMeters += segment.lengthMeters;
};

const attachNearbyUnlabeledRunwaySegments = (
  byRunwayId: Map<string, SurfaceRunwayEntry>,
  orphanSegments: SurfaceRunwaySegment[],
) => {
  const remaining = [...orphanSegments];

  while (remaining.length) {
    let best:
      | {
          orphanIndex: number;
          entry: SurfaceRunwayEntry;
          distance: number;
        }
      | null = null;

    remaining.forEach((orphan, orphanIndex) => {
      for (const entry of byRunwayId.values()) {
        for (const segment of entry.segments) {
          const distance = closestSegmentEndpointDistance(orphan, segment);
          if (!best || distance < best.distance) {
            best = { orphanIndex, entry, distance };
          }
        }
      }
    });

    if (!best || best.distance > RUNWAY_SEGMENT_JOIN_TOLERANCE_METERS) break;
    const [orphan] = remaining.splice(best.orphanIndex, 1);
    addSegmentToRunwayEntry(best.entry, orphan);
  }
};

const mergeRunwaySegments = (
  segments: { coordinates: Coordinate2D[]; firstIndex: number }[],
) => {
  const remaining = [...segments].sort((left, right) => left.firstIndex - right.firstIndex);
  const first = remaining.shift();
  if (!first) return [];
  const chain = [...first.coordinates];

  while (remaining.length) {
    const chainStart = chain[0];
    const chainEnd = chain.at(-1);
    if (!chainStart || !chainEnd) break;

    let best:
      | {
          index: number;
          distance: number;
          mode: "append" | "append-reverse" | "prepend" | "prepend-reverse";
        }
      | null = null;

    remaining.forEach((segment, index) => {
      const start = segment.coordinates[0];
      const end = segment.coordinates.at(-1);
      if (!start || !end) return;
      const candidates = [
        {
          mode: "append" as const,
          distance: metersBetweenCoordinates(chainEnd, start),
        },
        {
          mode: "append-reverse" as const,
          distance: metersBetweenCoordinates(chainEnd, end),
        },
        {
          mode: "prepend" as const,
          distance: metersBetweenCoordinates(chainStart, end),
        },
        {
          mode: "prepend-reverse" as const,
          distance: metersBetweenCoordinates(chainStart, start),
        },
      ];
      for (const candidate of candidates) {
        if (!best || candidate.distance < best.distance) {
          best = { index, ...candidate };
        }
      }
    });

    if (!best || best.distance > RUNWAY_SEGMENT_JOIN_TOLERANCE_METERS) break;

    const [segment] = remaining.splice(best.index, 1);
    if (best.mode === "append") {
      chain.push(...segment.coordinates.slice(1));
    } else if (best.mode === "append-reverse") {
      chain.push(...segment.coordinates.slice(0, -1).reverse());
    } else if (best.mode === "prepend") {
      chain.unshift(...segment.coordinates.slice(0, -1));
    } else {
      chain.unshift(...segment.coordinates.slice(1).reverse());
    }
  }

  return chain;
};

const orientedSurfaceRunwayCoordinates = (
  coordinates: Coordinate2D[],
  referenceRunway: RunwayAnnotationRecord | null,
) => {
  if (coordinates.length < 2) return coordinates;
  const start = coordinates[0];
  const end = coordinates.at(-1);
  const referenceEnds = (referenceRunway?.ends || []).filter(
    (item: RunwayAnnotationRecord) => Number.isFinite(item?.lat) && Number.isFinite(item?.lon),
  );
  if (!start || !end || referenceEnds.length < 2) return coordinates;

  const referenceStart: Coordinate2D = [referenceEnds[0].lon, referenceEnds[0].lat];
  const referenceEnd: Coordinate2D = [referenceEnds[1].lon, referenceEnds[1].lat];
  const forwardCost =
    metersBetweenCoordinates(start, referenceStart) +
    metersBetweenCoordinates(end, referenceEnd);
  const reverseCost =
    metersBetweenCoordinates(end, referenceStart) +
    metersBetweenCoordinates(start, referenceEnd);

  return reverseCost < forwardCost ? [...coordinates].reverse() : coordinates;
};

const mergedRunwayFeatureId = (id: string) =>
  `osm-runway-${id.replace(/[^A-Z0-9]+/g, "-")}`;

const canonicalSurfaceRunwayFeatures = (
  surfaceMap: RunwayAnnotationRecord,
  referenceRunwayMap: RunwayAnnotationRecord = null,
) => {
  const sourceFeatures = surfaceMap?.features?.features;
  if (!Array.isArray(sourceFeatures)) return [];
  const referenceById = normalizedRunwayMapById(referenceRunwayMap);

  const byRunwayId = new Map<string, SurfaceRunwayEntry>();
  const orphanSegments: SurfaceRunwaySegment[] = [];
  sourceFeatures.forEach((feature, index) => {
    if (
      feature?.properties?.kind !== "runway" ||
      feature?.geometry?.type !== "LineString"
    ) {
      return;
    }

    const coordinates = (feature?.geometry?.coordinates || []).filter(isCoordinate2D);
    if (coordinates.length < 2) return;

    const lengthMeters = lineLengthMeters(coordinates);
    if (!Number.isFinite(lengthMeters) || lengthMeters <= 0) return;
    const segment = {
      feature,
      coordinates,
      firstIndex: index,
      lengthMeters,
    };

    const id = runwaySurfaceId(feature, index);
    if (!id) {
      orphanSegments.push(segment);
      return;
    }

    const existing = byRunwayId.get(id);
    if (existing) {
      addSegmentToRunwayEntry(existing, segment);
    } else {
      byRunwayId.set(id, {
        id,
        firstIndex: index,
        features: [feature],
        segments: [segment],
        lengthMeters,
      });
    }
  });

  attachNearbyUnlabeledRunwaySegments(byRunwayId, orphanSegments);

  return [...byRunwayId.values()]
    .map((entry) => {
      const mergedCoordinates = mergeRunwaySegments(entry.segments);
      if (mergedCoordinates.length < 2) return null;
      const referenceRunway = referenceById.get(entry.id) || null;
      const coordinates = orientedSurfaceRunwayCoordinates(
        mergedCoordinates,
        referenceRunway,
      );
      const representative = entry.features[0] || {};
      const properties = representative.properties || {};
      const feature = {
        ...representative,
        geometry: {
          type: "LineString",
          coordinates,
        },
        properties: {
          ...properties,
          id: mergedRunwayFeatureId(entry.id),
          kind: "runway",
          name: entry.id,
          ref: entry.id,
          sourceIds: entry.features
            .map((item: RunwayAnnotationRecord) => item?.properties?.id)
            .filter(Boolean),
        },
      };
      return {
        ...entry,
        feature,
        coordinates,
        referenceRunway,
        lengthMeters: lineLengthMeters(coordinates),
      };
    })
    .filter(
      (entry): entry is CanonicalSurfaceRunwayFeature => Boolean(entry),
    )
    .sort((left, right) => left.firstIndex - right.firstIndex);
};

export function buildRenderableAirportSurfaceFeatureCollection(
  surfaceMap: RunwayAnnotationRecord,
  referenceRunwayMap: RunwayAnnotationRecord = null,
) {
  const sourceFeatures = surfaceMap?.features?.features;
  if (!Array.isArray(sourceFeatures)) return null;

  const runwayFeatures = canonicalSurfaceRunwayFeatures(
    surfaceMap,
    referenceRunwayMap,
  ).map((entry) => entry.feature);
  const nonRunwayFeatures = sourceFeatures.filter(
    (feature) => feature?.properties?.kind !== "runway",
  );

  return {
    type: "FeatureCollection",
    features: [...nonRunwayFeatures, ...runwayFeatures],
  };
}

const runwayEndsFromSurfaceFeature = (
  runwayId: string,
  coordinates: Coordinate2D[],
  referenceRunway: RunwayAnnotationRecord | null = null,
) => {
  const start = coordinates[0];
  const end = coordinates.at(-1);
  if (!isCoordinate2D(start) || !isCoordinate2D(end)) return [];

  const referenceEnds = (referenceRunway?.ends || [])
    .map((item: RunwayAnnotationRecord) => normalizedRunwayEndIdent(item?.ident))
    .filter(Boolean);
  const [startIdent = runwayId, endIdent = runwayId] =
    referenceEnds.length >= 2
      ? referenceEnds
      : runwayId
          .split("/")
          .map((value) => value.trim())
          .filter(Boolean);

  return [
    { ident: startIdent, lon: start[0], lat: start[1] },
    { ident: endIdent, lon: end[0], lat: end[1] },
  ];
};

export function buildRunwayMapFromSurfaceMap(
  surfaceMap: RunwayAnnotationRecord,
  referenceRunwayMap: RunwayAnnotationRecord = null,
) {
  const runways = canonicalSurfaceRunwayFeatures(surfaceMap, referenceRunwayMap)
    .map(({ feature, id, coordinates, referenceRunway }) => {
      const ends = runwayEndsFromSurfaceFeature(id, coordinates, referenceRunway);
      if (ends.length < 2) return null;

      return {
        id,
        sourceId: feature?.properties?.id || "",
        widthFt: Number(feature?.properties?.widthFt),
        ends,
        centerline: {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates,
          },
          properties: {
            id,
            sourceId: feature?.properties?.id || "",
            source: surfaceMap?.source || "OpenStreetMap",
            ends: ends.map((end) => end.ident),
          },
        },
      };
    })
    .filter(Boolean);

  if (!runways.length) return null;

  return {
    airport: surfaceMap?.airport || "",
    source: surfaceMap?.source || "OpenStreetMap",
    sourceAttribution: surfaceMap?.sourceAttribution || "",
    runways,
  };
}

const runwayBeamProfileForZoom = (zoom: unknown) => {
  const numericZoom = Number.isFinite(Number(zoom)) ? Number(zoom) : ZOOM_APPROACH;
  const profiles = RUNWAY_APPROACH_BEAM_CONFIG.profiles.map((profile) => ({
    ...profile,
    distance: profile.distanceSm * STATUTE_MILE_METERS,
  }));

  if (numericZoom <= profiles[0].zoom) return profiles[0];
  if (numericZoom >= profiles.at(-1).zoom) return profiles.at(-1);

  const upperIndex = profiles.findIndex((profile) => numericZoom <= profile.zoom);
  const lower = profiles[upperIndex - 1];
  const upper = profiles[upperIndex];
  const progress = clamp(
    (numericZoom - lower.zoom) / (upper.zoom - lower.zoom),
    0,
    1,
  );

  return {
    zoom: numericZoom,
    distance: interpolate(lower.distance, upper.distance, progress),
    angle: interpolate(lower.angle, upper.angle, progress),
    nearDistance: interpolate(lower.nearDistance, upper.nearDistance, progress),
    nearAngle: interpolate(lower.nearAngle, upper.nearAngle, progress),
    nearWidth: interpolate(lower.nearWidth, upper.nearWidth, progress),
    opacity: interpolate(lower.opacity, upper.opacity, progress),
  };
};

const scaleRunwayBeamProfile = (profile: RunwayAnnotationRecord, distanceScale = 1) => ({
  ...profile,
  distance: profile.distance * distanceScale,
  nearDistance: profile.nearDistance * distanceScale,
  nearWidth: profile.nearWidth * distanceScale,
});

const runwayEndVector = (end: RunwayAnnotationRecord, oppositeEnd: RunwayAnnotationRecord) => {
  const lonMeters = metersPerDegreeLongitude(end.lat);
  const dx = (end.lon - oppositeEnd.lon) * lonMeters;
  const dy = (end.lat - oppositeEnd.lat) * METERS_PER_DEGREE_LATITUDE;
  const length = Math.hypot(dx, dy);
  if (!Number.isFinite(length) || length <= 0) return null;

  return {
    x: dx / length,
    y: dy / length,
    lonMeters,
  };
};

const offsetPoint = ({ end, vector, distance, halfWidth, side }: RunwayAnnotationRecord) => {
  const perpendicularX = -vector.y;
  const perpendicularY = vector.x;
  const x = vector.x * distance + perpendicularX * halfWidth * side;
  const y = vector.y * distance + perpendicularY * halfWidth * side;

  return [
    end.lon + x / vector.lonMeters,
    end.lat + y / METERS_PER_DEGREE_LATITUDE,
  ];
};

const coordinateFromVectorMeters = ({ end, vector, distance }: RunwayAnnotationRecord) => [
  end.lon + (vector.x * distance) / vector.lonMeters,
  end.lat + (vector.y * distance) / METERS_PER_DEGREE_LATITUDE,
];

const lineCoordinateAtProgress = (
  start: Coordinate2D,
  end: Coordinate2D,
  progress: number,
) => [
  start[0] + (end[0] - start[0]) * progress,
  start[1] + (end[1] - start[1]) * progress,
] as Coordinate2D;

const runwayVectorFromCoordinates = (start: Coordinate2D, end: Coordinate2D) => {
  const lonMeters = metersPerDegreeLongitude((start[1] + end[1]) / 2);
  const dx = (end[0] - start[0]) * lonMeters;
  const dy = (end[1] - start[1]) * METERS_PER_DEGREE_LATITUDE;
  const length = Math.hypot(dx, dy);
  if (!Number.isFinite(length) || length <= 0) return null;

  return {
    x: dx / length,
    y: dy / length,
    lonMeters,
    length,
  };
};

const offsetCoordinate = (
  coordinate: Coordinate2D,
  vector: RunwayAnnotationRecord,
  lateralDistanceMeters: number,
) => {
  const perpendicularX = -vector.y;
  const perpendicularY = vector.x;
  return [
    coordinate[0] + (perpendicularX * lateralDistanceMeters) / vector.lonMeters,
    coordinate[1] + (perpendicularY * lateralDistanceMeters) / METERS_PER_DEGREE_LATITUDE,
  ] as Coordinate2D;
};

const runwayWidthMeters = (runway: RunwayAnnotationRecord) => {
  const widthMeters = Number(runway?.widthFt) * FEET_TO_METERS;
  if (!Number.isFinite(widthMeters) || widthMeters <= 0) {
    return DEFAULT_RUNWAY_WIDTH_METERS;
  }
  return clamp(
    widthMeters,
    MIN_RUNWAY_LIGHT_WIDTH_METERS,
    MAX_RUNWAY_LIGHT_WIDTH_METERS,
  );
};

const runwayLightFeaturesForRunway = (runway: RunwayAnnotationRecord) => {
  const coordinates = runway?.centerline?.geometry?.coordinates || [];
  const start = coordinates[0];
  const end = coordinates.at(-1);
  if (!isCoordinate2D(start) || !isCoordinate2D(end)) {
    return [];
  }

  const vector = runwayVectorFromCoordinates(start, end);
  if (!vector) return [];
  const lightCount = Math.max(
    2,
    Math.min(72, Math.floor(vector.length / RUNWAY_LIGHT_SPACING_METERS)),
  );
  const centerLightCount = Math.max(
    2,
    Math.min(
      42,
      Math.floor(vector.length / RUNWAY_CENTERLINE_LIGHT_SPACING_METERS),
    ),
  );
  const halfWidthMeters = runwayWidthMeters(runway) / 2;

  const edgeLights = [-1, 1].flatMap((side) =>
    Array.from({ length: lightCount + 1 }, (_, index) => {
      const progress = index / lightCount;
      const center = lineCoordinateAtProgress(start, end, progress);
      const coordinate = offsetCoordinate(center, vector, halfWidthMeters * side);
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: coordinate,
        },
        properties: {
          kind: "edge",
          runwayId: runway.id,
          lightIndex: index,
          progress,
          side: side < 0 ? "left" : "right",
        },
      };
    }),
  );

  const centerlineLights = Array.from({ length: centerLightCount + 1 }, (_, index) => {
    const progress = index / centerLightCount;
    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: lineCoordinateAtProgress(start, end, progress),
      },
      properties: {
        kind: "centerline",
        runwayId: runway.id,
        lightIndex: index,
        progress,
        side: "center",
      },
    };
  });

  return [...edgeLights, ...centerlineLights];
};

const runwayApproachLightDistance = (profile: RunwayAnnotationRecord) =>
  clamp(
    profile.distance * 0.28,
    MIN_RUNWAY_APPROACH_LIGHT_DISTANCE_METERS,
    MAX_RUNWAY_APPROACH_LIGHT_DISTANCE_METERS,
  );

const runwayApproachLightFeaturesForRunway = (
  runway: RunwayAnnotationRecord,
  profile: RunwayAnnotationRecord,
) => {
  const ends = (runway.ends || []).filter(
    (end) => Number.isFinite(end.lat) && Number.isFinite(end.lon),
  );
  if (ends.length < 2) return [];

  const distance = runwayApproachLightDistance(profile);
  const lightCount = Math.max(
    4,
    Math.min(18, Math.floor(distance / RUNWAY_APPROACH_LIGHT_SPACING_METERS)),
  );

  return ends.flatMap((end, endIndex) => {
    const oppositeEnd = ends[endIndex === 0 ? 1 : 0];
    const vector = runwayEndVector(end, oppositeEnd);
    if (!vector) return [];

    return Array.from({ length: lightCount }, (_, index) => {
      const progress = (index + 1) / lightCount;
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: coordinateFromVectorMeters({
            end,
            vector,
            distance: progress * distance,
          }),
        },
        properties: {
          kind: "approach",
          runwayId: runway.id,
          runwayEnd: end.ident,
          lightIndex: index,
          progress,
        },
      };
    });
  });
};

const rotateVector = (vector: RunwayAnnotationRecord, degrees: number) => {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    ...vector,
    x: vector.x * cos - vector.y * sin,
    y: vector.x * sin + vector.y * cos,
  };
};

const arcCoordinates = ({ end, vector, distance, halfAngle, reverse = false }: RunwayAnnotationRecord) => {
  const points = [];

  for (
    let index = 0;
    index <= RUNWAY_APPROACH_BEAM_CONFIG.arcSegments;
    index += 1
  ) {
    const progress = index / RUNWAY_APPROACH_BEAM_CONFIG.arcSegments;
    const angle = reverse
      ? halfAngle - progress * halfAngle * 2
      : -halfAngle + progress * halfAngle * 2;
    const rotated = rotateVector(vector, angle);
    points.push(coordinateFromVectorMeters({ end, vector: rotated, distance }));
  }

  return points;
};

const buildRunwayEndBeamFeature = (runway: RunwayAnnotationRecord, end: RunwayAnnotationRecord, oppositeEnd: RunwayAnnotationRecord, profile: RunwayAnnotationRecord) => {
  const vector = runwayEndVector(end, oppositeEnd);
  if (!vector) return null;

  const nearHalfWidth = Math.max(
    Math.tan(((profile.nearAngle / 2) * Math.PI) / 180) * profile.nearDistance,
    (profile.nearWidth || 0) / 2,
  );
  const nearArc = [
    offsetPoint({
      end,
      vector,
      distance: profile.nearDistance,
      halfWidth: nearHalfWidth,
      side: -1,
    }),
    offsetPoint({
      end,
      vector,
      distance: profile.nearDistance,
      halfWidth: nearHalfWidth,
      side: 1,
    }),
  ];
  const farArc = arcCoordinates({
    end,
    vector,
    distance: profile.distance,
    halfAngle: profile.angle / 2,
    reverse: true,
  });
  const ring = [...nearArc, ...farArc, nearArc[0]];

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [ring],
    },
    properties: {
      runwayId: runway.id,
      runwayEnd: end.ident,
      beamDistanceMeters: profile.distance,
      beamAngleDegrees: profile.angle,
      beamOpacity: profile.opacity,
      gradientStart: coordinateFromVectorMeters({
        end,
        vector,
        distance: profile.nearDistance,
      }),
      gradientEnd: coordinateFromVectorMeters({
        end,
        vector,
        distance: profile.distance,
      }),
    },
  };
};

export function buildRunwayEndLabels(runwayMap: RunwayAnnotationRecord, { zoom }: RunwayAnnotationRecord = {}) {
  if (zoom != null && !shouldShowRunwayEndLabels(zoom)) return [];

  return (runwayMap?.runways || []).flatMap((runway) =>
    (runway.ends || [])
      .filter((end) => Number.isFinite(end.lat) && Number.isFinite(end.lon))
      .map((end) => ({
        key: `${runway.id}-${end.ident}`,
        runwayId: runway.id,
        ident: end.ident,
        lat: end.lat,
        lon: end.lon,
      })),
  );
}

function buildRunwayApproachBeamCollection(
  runwayMap: RunwayAnnotationRecord,
  { zoom, distanceScale = 1 }: RunwayAnnotationRecord = {},
) {
  const profile = scaleRunwayBeamProfile(
    runwayBeamProfileForZoom(zoom),
    distanceScale,
  );

  return {
    type: "FeatureCollection",
    properties: {
      airport: runwayMap?.airport || "",
      source: runwayMap?.source || "Runway geometry",
      cycle: runwayMap?.cycle || "",
    },
    features: (runwayMap?.runways || []).flatMap((runway) => {
      const ends = (runway.ends || []).filter(
        (end) => Number.isFinite(end.lat) && Number.isFinite(end.lon),
      );
      if (ends.length < 2) return [];

      return ends
        .map((end, index) =>
          buildRunwayEndBeamFeature(runway, end, ends[index === 0 ? 1 : 0], profile),
        )
        .filter(Boolean);
    }),
  };
}

// Centerline-extension variant used on the light theme — a soft
// glowing wedge washed out on the bright basemap, so we draw a dashed
// extended centerline (chart convention) instead.
const buildRunwayEndApproachLineFeature = (runway: RunwayAnnotationRecord, end: RunwayAnnotationRecord, oppositeEnd: RunwayAnnotationRecord, profile: RunwayAnnotationRecord) => {
  const vector = runwayEndVector(end, oppositeEnd);
  if (!vector) return null;

  return {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: [
        [end.lon, end.lat],
        coordinateFromVectorMeters({
          end,
          vector,
          distance: profile.distance,
        }),
      ],
    },
    properties: {
      runwayId: runway.id,
      runwayEnd: end.ident,
      beamDistanceMeters: profile.distance,
      beamOpacity: profile.opacity,
    },
  };
};

function buildRunwayApproachLineCollection(
  runwayMap: RunwayAnnotationRecord,
  { zoom, distanceScale = 1 }: RunwayAnnotationRecord = {},
) {
  const profile = scaleRunwayBeamProfile(
    runwayBeamProfileForZoom(zoom),
    distanceScale,
  );

  return {
    type: "FeatureCollection",
    properties: {
      airport: runwayMap?.airport || "",
      source: runwayMap?.source || "Runway geometry",
      cycle: runwayMap?.cycle || "",
    },
    features: (runwayMap?.runways || []).flatMap((runway) => {
      const ends = (runway.ends || []).filter(
        (end) => Number.isFinite(end.lat) && Number.isFinite(end.lon),
      );
      if (ends.length < 2) return [];

      return ends
        .map((end, index) =>
          buildRunwayEndApproachLineFeature(
            runway,
            end,
            ends[index === 0 ? 1 : 0],
            profile,
          ),
        )
        .filter(Boolean);
    }),
  };
}

// Theme-aware entry point: returns the variant the active theme wants
// alongside a `kind` discriminator so the layer can pick its render
// pipeline. Dark = wedge + gradient; light = dashed extended centerline.
export function buildRunwayApproachVisualization(
  runwayMap: RunwayAnnotationRecord,
  { zoom, theme = "dark", distanceScale = 1 }: RunwayAnnotationRecord = {},
) {
  if (theme === "light") {
    return {
      kind: "approach-lines",
      data: buildRunwayApproachLineCollection(runwayMap, { zoom, distanceScale }),
    };
  }
  return {
    kind: "approach-beams",
    data: buildRunwayApproachBeamCollection(runwayMap, { zoom, distanceScale }),
  };
}

export function resolveRunwayAnnotationVisibility({
  showRunwayBeams = true,
}: RunwayAnnotationRecord = {}) {
  return {
    showBeams: Boolean(showRunwayBeams),
    showBadges: true,
  };
}

export function buildRunwayLightCollection(runwayMap: RunwayAnnotationRecord) {
  return {
    type: "FeatureCollection",
    properties: {
      airport: runwayMap?.airport || "",
      source: runwayMap?.source || "Runway geometry",
      cycle: runwayMap?.cycle || "",
    },
    features: (runwayMap?.runways || []).flatMap(runwayLightFeaturesForRunway),
  };
}

export function buildRunwayApproachLightCollection(
  runwayMap: RunwayAnnotationRecord,
  { zoom, distanceScale = 1 }: RunwayAnnotationRecord = {},
) {
  const profile = scaleRunwayBeamProfile(
    runwayBeamProfileForZoom(zoom),
    distanceScale,
  );

  return {
    type: "FeatureCollection",
    properties: {
      airport: runwayMap?.airport || "",
      source: runwayMap?.source || "Runway geometry",
      cycle: runwayMap?.cycle || "",
    },
    features: (runwayMap?.runways || []).flatMap((runway) =>
      runwayApproachLightFeaturesForRunway(runway, profile),
    ),
  };
}

export function buildRunwayCenterlineCollection(runwayMap: RunwayAnnotationRecord) {
  return {
    type: "FeatureCollection",
    properties: {
      airport: runwayMap?.airport || "",
      source: runwayMap?.source || "Runway geometry",
      cycle: runwayMap?.cycle || "",
    },
    features: (runwayMap?.runways || [])
      .map((runway) => runway.centerline)
      .filter(
        (centerline) =>
          centerline?.type === "Feature" &&
          centerline.geometry?.type === "LineString",
      ),
  };
}
