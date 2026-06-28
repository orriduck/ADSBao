// Cheap, crisp-line runway ground lighting (night).
//
// Replaces the old FAA per-point light field (thousands of circleMarkers). The
// visual trick — taken from the design reference (kbos-lighting-cheap.html) — is
// that "edge lights" are a single DASHED line, not a row of point markers. So
// this model emits a handful of GeoJSON LineStrings (+ a few REIL points) per
// runway; the renderer styles them by `role`. No per-point markers, no glow, no
// blur. Everything derives from runway centerline + width + ends.
//
// Roles:
//   "edge"          white dashed runway edge (the middle ~60%)
//   "edge-caution"  amber dashed edge (the last ~20% at BOTH ends)
//   "centerline"    faint white dashed centerline
//   "endbar"        crisp white transverse bar at each physical end
//   "reil"          a flashing white point pair outboard of each end

import {
  lineCoordinateAtProgress,
  offsetCoordinate,
  runwayVectorFromCoordinates,
  runwayWidthMeters,
  type Coordinate2D,
} from "./runwayAnnotationModel";

// Last ~20% of the runway at each end is the amber caution zone, capped so very
// long runways still keep a dominant white middle.
const CAUTION_FRACTION = 0.2;
const CAUTION_MAX_METERS = 600;
// REIL strobes sit just outboard of the runway edge.
const REIL_OUTBOARD_METERS = 12;

const isCoordinate2D = (value: unknown): value is Coordinate2D =>
  Array.isArray(value) &&
  value.length === 2 &&
  Number.isFinite(value[0]) &&
  Number.isFinite(value[1]);

const lineFeature = (
  coordinates: Coordinate2D[],
  role: string,
  runwayId: unknown,
) => ({
  type: "Feature" as const,
  geometry: { type: "LineString" as const, coordinates },
  properties: { role, runwayId },
});

const pointFeature = (coordinate: Coordinate2D, role: string, runwayId: unknown) => ({
  type: "Feature" as const,
  geometry: { type: "Point" as const, coordinates: coordinate },
  properties: { role, runwayId },
});

// A straight runway edge offset to one side, split by arc length into
// amber / white / amber so the caution zones read at both ends regardless of the
// active landing direction (direction-neutral; a future METAR/ATIS enhancement
// can color the live approach end).
const edgeSegmentsForSide = (
  start: Coordinate2D,
  end: Coordinate2D,
  vector: { x: number; y: number; lonMeters: number },
  halfWidthMeters: number,
  side: number,
  cautionFraction: number,
  runwayId: unknown,
) => {
  const at = (progress: number) =>
    offsetCoordinate(
      lineCoordinateAtProgress(start, end, progress),
      vector,
      halfWidthMeters * side,
    );
  const near = cautionFraction;
  const far = 1 - cautionFraction;
  return [
    lineFeature([at(0), at(near)], "edge-caution", runwayId),
    lineFeature([at(near), at(far)], "edge", runwayId),
    lineFeature([at(far), at(1)], "edge-caution", runwayId),
  ];
};

const runwayLightingFeatures = (runway: Record<string, any>) => {
  if (runway?.lighted === false) return [];
  const coordinates = runway?.centerline?.geometry?.coordinates || [];
  const start = coordinates[0];
  const end = coordinates.at?.(-1) ?? coordinates[coordinates.length - 1];
  if (!isCoordinate2D(start) || !isCoordinate2D(end)) return [];

  const vector = runwayVectorFromCoordinates(start, end);
  if (!vector) return [];

  const halfWidth = runwayWidthMeters(runway) / 2;
  const cautionFraction = Math.min(
    CAUTION_FRACTION,
    CAUTION_MAX_METERS / vector.length,
    0.45,
  );
  const runwayId = runway?.id;
  const features: Record<string, any>[] = [];

  // Two dashed edges (white middle + amber ends).
  for (const side of [-1, 1]) {
    features.push(
      ...edgeSegmentsForSide(
        start,
        end,
        vector,
        halfWidth,
        side,
        cautionFraction,
        runwayId,
      ),
    );
  }

  // Faint dashed centerline.
  features.push(lineFeature([start, end], "centerline", runwayId));

  // Transverse end bar + REIL strobe pair at each physical end.
  for (const endpoint of [start, end]) {
    features.push(
      lineFeature(
        [
          offsetCoordinate(endpoint, vector, halfWidth),
          offsetCoordinate(endpoint, vector, -halfWidth),
        ],
        "endbar",
        runwayId,
      ),
    );
    const reilOffset = halfWidth + REIL_OUTBOARD_METERS;
    features.push(
      pointFeature(offsetCoordinate(endpoint, vector, reilOffset), "reil", runwayId),
      pointFeature(offsetCoordinate(endpoint, vector, -reilOffset), "reil", runwayId),
    );
  }

  return features;
};

// Build the runway night-lighting FeatureCollection (LineStrings + REIL points)
// from a runway map. Taxiway lighting is rendered separately from OSM surface
// geometry in the layer component.
export const buildRunwayGroundLightingCollection = (
  runwayMap: Record<string, any> | null | undefined,
) => {
  const runways = Array.isArray(runwayMap?.runways) ? runwayMap.runways : [];
  const features = runways.flatMap((runway: Record<string, any>) =>
    runwayLightingFeatures(runway),
  );
  return { type: "FeatureCollection" as const, features };
};
