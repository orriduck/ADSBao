import {
  ZOOM_AIRPORT,
  ZOOM_APPROACH,
  ZOOM_DETAIL,
} from "../../utils/airportMapDisplay.js";

const METERS_PER_DEGREE_LATITUDE = 111_320;
const STATUTE_MILE_METERS = 1_609.344;
const BEAM_ARC_SEGMENTS = 18;

const RUNWAY_BEAM_ZOOM_PROFILES = [
  {
    zoom: ZOOM_APPROACH,
    distance: 10 * STATUTE_MILE_METERS,
    angle: 10,
    nearDistance: 180,
    nearAngle: 3.2,
    nearWidth: 520,
    opacity: 0.3,
  },
  {
    zoom: ZOOM_AIRPORT,
    distance: 3.6 * STATUTE_MILE_METERS,
    angle: 12,
    nearDistance: 95,
    nearAngle: 7,
    nearWidth: 135,
    opacity: 0.25,
  },
  {
    zoom: ZOOM_DETAIL,
    distance: 1.45 * STATUTE_MILE_METERS,
    angle: 16,
    nearDistance: 70,
    nearAngle: 12,
    nearWidth: 92,
    opacity: 0.27,
  },
];

export const shouldShowRunwayEndLabels = (zoom) => Number(zoom) > ZOOM_APPROACH;

const metersPerDegreeLongitude = (latitude) =>
  METERS_PER_DEGREE_LATITUDE * Math.cos((latitude * Math.PI) / 180);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const interpolate = (from, to, progress) => from + (to - from) * progress;

const runwayBeamProfileForZoom = (zoom) => {
  const numericZoom = Number.isFinite(Number(zoom)) ? Number(zoom) : ZOOM_APPROACH;
  const profiles = RUNWAY_BEAM_ZOOM_PROFILES;

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

const runwayEndVector = (end, oppositeEnd) => {
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

const offsetPoint = ({ end, vector, distance, halfWidth, side }) => {
  const perpendicularX = -vector.y;
  const perpendicularY = vector.x;
  const x = vector.x * distance + perpendicularX * halfWidth * side;
  const y = vector.y * distance + perpendicularY * halfWidth * side;

  return [
    end.lon + x / vector.lonMeters,
    end.lat + y / METERS_PER_DEGREE_LATITUDE,
  ];
};

const coordinateFromVectorMeters = ({ end, vector, distance }) => [
  end.lon + (vector.x * distance) / vector.lonMeters,
  end.lat + (vector.y * distance) / METERS_PER_DEGREE_LATITUDE,
];

const rotateVector = (vector, degrees) => {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    ...vector,
    x: vector.x * cos - vector.y * sin,
    y: vector.x * sin + vector.y * cos,
  };
};

const arcCoordinates = ({ end, vector, distance, halfAngle, reverse = false }) => {
  const points = [];

  for (let index = 0; index <= BEAM_ARC_SEGMENTS; index += 1) {
    const progress = index / BEAM_ARC_SEGMENTS;
    const angle = reverse
      ? halfAngle - progress * halfAngle * 2
      : -halfAngle + progress * halfAngle * 2;
    const rotated = rotateVector(vector, angle);
    points.push(coordinateFromVectorMeters({ end, vector: rotated, distance }));
  }

  return points;
};

const buildRunwayEndBeamFeature = (runway, end, oppositeEnd, profile) => {
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

export function buildRunwayEndLabels(runwayMap, { zoom } = {}) {
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

export function buildRunwayApproachBeamCollection(runwayMap, { zoom } = {}) {
  const profile = runwayBeamProfileForZoom(zoom);

  return {
    type: "FeatureCollection",
    properties: {
      airport: runwayMap?.airport || "",
      source: runwayMap?.source || "FAA CIFP",
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

export function buildRunwayCenterlineCollection(runwayMap) {
  return {
    type: "FeatureCollection",
    properties: {
      airport: runwayMap?.airport || "",
      source: runwayMap?.source || "FAA CIFP",
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
