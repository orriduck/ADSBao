import { RUNWAY_APPROACH_BEAM_CONFIG } from "../../../config/airportMap";
import { ZOOM_APPROACH } from "../../../utils/airportMapDisplay";
import { isImmersiveNightLightingActive } from "../immersive/immersiveLightingModel";
import { shouldShowRunwayEndLabelsForZoom } from "./airportMapZoomFeatures";

const METERS_PER_DEGREE_LATITUDE = 111_320;
const STATUTE_MILE_METERS = 1_609.344;
const FEET_TO_METERS = 0.3048;
const RUNWAY_LIGHT_SPACING_METERS = 180;
const DEFAULT_RUNWAY_WIDTH_METERS = 45;
const MIN_RUNWAY_LIGHT_WIDTH_METERS = 18;
const MAX_RUNWAY_LIGHT_WIDTH_METERS = 80;

const shouldShowRunwayEndLabels = shouldShowRunwayEndLabelsForZoom;

type RunwayAnnotationRecord = Record<string, any>;
type Coordinate2D = [number, number];

const metersPerDegreeLongitude = (latitude: number) =>
  METERS_PER_DEGREE_LATITUDE * Math.cos((latitude * Math.PI) / 180);

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const interpolate = (from: number, to: number, progress: number) => from + (to - from) * progress;

const isCoordinate2D = (value: unknown): value is Coordinate2D =>
  Array.isArray(value) &&
  Number.isFinite(value[0]) &&
  Number.isFinite(value[1]);

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

const metersBetweenCoordinates = (
  [startLon, startLat]: Coordinate2D,
  [endLon, endLat]: Coordinate2D,
) => {
  const lonMeters = metersPerDegreeLongitude((startLat + endLat) / 2);
  const dx = (endLon - startLon) * lonMeters;
  const dy = (endLat - startLat) * METERS_PER_DEGREE_LATITUDE;
  return Math.hypot(dx, dy);
};

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
    Math.min(36, Math.floor(vector.length / RUNWAY_LIGHT_SPACING_METERS)),
  );
  const halfWidthMeters = runwayWidthMeters(runway) / 2;

  return [-1, 1].flatMap((side) =>
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
          runwayId: runway.id,
          lightIndex: index,
          progress,
          side: side < 0 ? "left" : "right",
        },
      };
    }),
  );
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
  immersiveModeActive = false,
  immersiveLocalMinutes = null,
  immersivePhase = "",
  showRunwayBeams = true,
}: RunwayAnnotationRecord = {}) {
  if (!immersiveModeActive) {
    return {
      showBeams: Boolean(showRunwayBeams),
      showBadges: true,
    };
  }

  return {
    showBeams: isImmersiveNightLightingActive({
      localMinutes: immersiveLocalMinutes,
      phase: immersivePhase,
    }),
    showBadges: false,
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
