// FAA AIM Ch.2 §3 runway/taxiway lighting, synthesized from geometry.
//
// OSM lighting tags (navigationaid=*) are too sparse for global coverage, so
// we derive FAA-correct COLOR + SPACING from the runway geometry we have
// (endpoints, length, width, displaced thresholds, `lighted`). Output is plain
// GeoJSON point features tagged with a semantic color ROLE — the Leaflet layer
// maps each role to a CSS variable so themes stay the source of truth. All math
// reuses the shared helpers exported from runwayAnnotationModel.ts.

import { RUNWAY_FAA_LIGHTING_CONFIG } from "../../../config/airportMap";
import {
  runwayLightingLodBandRank,
  type RunwayLightingLodBand,
} from "./airportMapZoomFeatures";
import {
  FEET_TO_METERS,
  clamp,
  type Coordinate2D,
  metersBetweenCoordinates,
  lineCoordinateAtProgress,
  runwayVectorFromCoordinates,
  offsetCoordinate,
  runwayWidthMeters,
  runwayEndVector,
  coordinateFromVectorMeters,
} from "./runwayAnnotationModel";

type LightRecord = Record<string, any>;

export type { RunwayLightingLodBand } from "./airportMapZoomFeatures";

export type LightColorRole = "white" | "amber" | "red" | "green" | "blue";

export type LightRole =
  | "edge"
  | "edge-caution"
  | "centerline"
  | "centerline-alt"
  | "centerline-red"
  | "threshold"
  | "end"
  | "end-side"
  | "tdz"
  | "reil"
  | "approach"
  | "taxiway-edge"
  | "taxiway-centerline";

const C = RUNWAY_FAA_LIGHTING_CONFIG;
const ftToM = (feet: number) => feet * FEET_TO_METERS;

const ROLE_RADIUS_BUCKET: Record<LightRole, keyof typeof C.radius> = {
  edge: "edge",
  "edge-caution": "edge",
  centerline: "centerline",
  "centerline-alt": "centerline",
  "centerline-red": "centerline",
  threshold: "endBar",
  end: "endBar",
  "end-side": "endBar",
  tdz: "tdz",
  reil: "reil",
  approach: "approach",
  "taxiway-edge": "taxiway",
  "taxiway-centerline": "taxiway",
};

// Screen-pixel radius for a light role (consumed by the canvas renderer and
// asserted indirectly via role in tests — never hardcode at call sites).
export const runwayLightRadius = (role: LightRole): number =>
  C.radius[ROLE_RADIUS_BUCKET[role]] ?? C.radius.centerline;

const isFiniteCoordinate = (value: unknown): value is Coordinate2D =>
  Array.isArray(value) &&
  Number.isFinite(value[0]) &&
  Number.isFinite(value[1]);

type PolylineSample = {
  coordinate: Coordinate2D;
  vector: LightRecord;
  distanceMeters: number;
  index: number;
};

// Walk a polyline by cumulative arc length and emit evenly-spaced samples
// (including both endpoints) with the local direction vector at each sample.
// Arc-length walking — not chord interpolation — keeps multi-vertex OSM
// runways/taxiways correctly spaced.
const sampleAlongPolyline = (
  coordinates: Coordinate2D[],
  spacingMeters: number,
): { samples: PolylineSample[]; totalMeters: number } => {
  const clean = coordinates.filter(isFiniteCoordinate);
  if (clean.length < 2 || spacingMeters <= 0) {
    return { samples: [], totalMeters: 0 };
  }

  const segments: { a: Coordinate2D; b: Coordinate2D; start: number; length: number }[] = [];
  let total = 0;
  for (let i = 1; i < clean.length; i += 1) {
    const length = metersBetweenCoordinates(clean[i - 1], clean[i]);
    if (length <= 0) continue;
    segments.push({ a: clean[i - 1], b: clean[i], start: total, length });
    total += length;
  }
  if (total <= 0 || segments.length === 0) return { samples: [], totalMeters: 0 };

  const count = Math.max(1, Math.round(total / spacingMeters));
  const step = total / count;
  const samples: PolylineSample[] = [];
  let segIndex = 0;
  for (let k = 0; k <= count; k += 1) {
    const distance = Math.min(k * step, total);
    while (
      segIndex < segments.length - 1 &&
      distance > segments[segIndex].start + segments[segIndex].length
    ) {
      segIndex += 1;
    }
    const segment = segments[segIndex];
    const fraction = segment.length > 0 ? (distance - segment.start) / segment.length : 0;
    const coordinate = lineCoordinateAtProgress(segment.a, segment.b, clamp(fraction, 0, 1));
    const vector = runwayVectorFromCoordinates(segment.a, segment.b);
    if (!vector) continue;
    samples.push({ coordinate, vector, distanceMeters: distance, index: k });
  }
  return { samples, totalMeters: total };
};

const feature = (coordinate: Coordinate2D, properties: LightRecord): LightRecord => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: coordinate },
  properties,
});

// Centerline color by distance from the NEARER threshold (symmetric / chart
// depiction): red in the last 1000ft, alternating red/white 1000–3000ft,
// white in the middle.
const centerlineColorRole = (
  remainingFt: number,
  index: number,
): { role: LightRole; color: LightColorRole } => {
  if (remainingFt <= C.centerlineRedFt) {
    return { role: "centerline-red", color: "red" };
  }
  if (remainingFt <= C.centerlineAltFt) {
    return index % 2 === 0
      ? { role: "centerline-alt", color: "red" }
      : { role: "centerline", color: "white" };
  }
  return { role: "centerline", color: "white" };
};

const runwayEnds = (runway: LightRecord) =>
  (runway?.ends || []).filter(
    (end: LightRecord) => Number.isFinite(end?.lat) && Number.isFinite(end?.lon),
  );

const runwayLightFeatures = (
  runway: LightRecord,
  { includeNear, decimateCenterline }: { includeNear: boolean; decimateCenterline: boolean },
): LightRecord[] => {
  const coordinates = (runway?.centerline?.geometry?.coordinates || []) as Coordinate2D[];
  if (coordinates.filter(isFiniteCoordinate).length < 2) return [];

  const halfWidthMeters = runwayWidthMeters(runway) / 2;
  const features: LightRecord[] = [];

  // --- Edge lights (200ft): white, amber within the caution zone of each end.
  const edge = sampleAlongPolyline(coordinates, ftToM(C.edgeSpacingFt));
  const totalMeters = edge.totalMeters;
  const lengthFt =
    Number.isFinite(runway?.lengthFt) && runway.lengthFt > 0
      ? Number(runway.lengthFt)
      : totalMeters / FEET_TO_METERS;
  const cautionFt = Math.min(C.edgeCautionFt, lengthFt / 2);

  for (const sample of edge.samples) {
    const remainingMeters = Math.min(sample.distanceMeters, totalMeters - sample.distanceMeters);
    const remainingFt = remainingMeters / FEET_TO_METERS;
    const caution = remainingFt <= cautionFt;
    for (const side of [-1, 1]) {
      features.push(
        feature(offsetCoordinate(sample.coordinate, sample.vector, halfWidthMeters * side), {
          role: caution ? "edge-caution" : "edge",
          color: caution ? "amber" : "white",
          runwayId: runway.id,
          side: side < 0 ? "left" : "right",
          lightIndex: sample.index,
          progress: totalMeters > 0 ? sample.distanceMeters / totalMeters : 0,
          minBand: "mid",
        }),
      );
    }
  }

  // --- Centerline lights (50ft): symmetric red / red-white / white.
  const centerline = sampleAlongPolyline(coordinates, ftToM(C.centerlineSpacingFt));
  centerline.samples.forEach((sample) => {
    if (decimateCenterline && sample.index % C.midCenterlineDecimation !== 0) {
      return;
    }
    const remainingMeters = Math.min(
      sample.distanceMeters,
      centerline.totalMeters - sample.distanceMeters,
    );
    const remainingFt = remainingMeters / FEET_TO_METERS;
    const { role, color } = centerlineColorRole(remainingFt, sample.index);
    features.push(
      feature(sample.coordinate, {
        role,
        color,
        runwayId: runway.id,
        side: "center",
        lightIndex: sample.index,
        progress:
          centerline.totalMeters > 0 ? sample.distanceMeters / centerline.totalMeters : 0,
        minBand: "mid",
      }),
    );
  });

  // --- Per-end systems: threshold (green) + end (red) bars, ALS dots,
  //     and (near band only) TDZL + REIL.
  const ends = runwayEnds(runway);
  if (ends.length >= 2) {
    ends.forEach((end: LightRecord, endIndex: number) => {
      const opposite = ends[endIndex === 0 ? 1 : 0];
      const vectorOut = runwayEndVector(end, opposite); // points outward (toward approach)
      if (!vectorOut) return;
      const displacedMeters = Math.max(0, Number(end.displacedThresholdFt || 0) * FEET_TO_METERS);
      const thresholdCoord = coordinateFromVectorMeters({
        end,
        vector: vectorOut,
        distance: -displacedMeters,
      }) as Coordinate2D;
      const thresholdEnd = { lon: thresholdCoord[0], lat: thresholdCoord[1] };

      const barLight = (
        center: Coordinate2D,
        i: number,
        n: number,
        role: LightRole,
        color: LightColorRole,
      ) => {
        const lateral = (i / Math.max(1, n - 1) - 0.5) * halfWidthMeters * 2;
        return feature(offsetCoordinate(center, vectorOut, lateral), {
          role,
          color,
          runwayId: runway.id,
          runwayEnd: end.ident,
          side: "center",
          lightIndex: i,
          minBand: "mid",
        });
      };

      // Green threshold bar at the (displaced) threshold; red end bar just
      // inboard so both colors read on a top-down map.
      for (let i = 0; i < C.endBarLightCount; i += 1) {
        features.push(barLight(thresholdCoord, i, C.endBarLightCount, "threshold", "green"));
      }
      const endBarCoord = coordinateFromVectorMeters({
        end: thresholdEnd,
        vector: vectorOut,
        distance: -ftToM(40),
      }) as Coordinate2D;
      for (let i = 0; i < C.endBarLightCount; i += 1) {
        features.push(barLight(endBarCoord, i, C.endBarLightCount, "end", "red"));
      }
      for (const sideSign of [-1, 1]) {
        for (let i = 0; i < C.endSideLightCount; i += 1) {
          const longitudinal = -ftToM((i + 1) * C.endSideLightSpacingFt);
          const lateral = sideSign * (halfWidthMeters + ftToM(C.endSideLightOffsetFt));
          const center = coordinateFromVectorMeters({
            end: thresholdEnd,
            vector: vectorOut,
            distance: longitudinal,
          }) as Coordinate2D;
          features.push(
            feature(offsetCoordinate(center, vectorOut, lateral), {
              role: "end-side",
              color: "red",
              runwayId: runway.id,
              runwayEnd: end.ident,
              side: sideSign < 0 ? "left" : "right",
              lightIndex: i,
              minBand: "near",
            }),
          );
        }
      }

      // ALS approach centerline dots, extending outward from the threshold.
      const approachLengthMeters = ftToM(2400);
      const approachCount = clamp(
        Math.round(approachLengthMeters / ftToM(C.edgeSpacingFt)),
        4,
        40,
      );
      const approachStep = approachLengthMeters / approachCount;
      for (let k = 1; k <= approachCount; k += 1) {
        features.push(
          feature(
            coordinateFromVectorMeters({
              end: thresholdEnd,
              vector: vectorOut,
              distance: k * approachStep,
            }) as Coordinate2D,
            {
              role: "approach",
              color: "white",
              runwayId: runway.id,
              runwayEnd: end.ident,
              side: "center",
              lightIndex: k,
              minBand: "mid",
            },
          ),
        );
      }

      if (!includeNear) return;

      // TDZL: two rows of white barrettes, tdzStartFt..min(tdzLengthFt, len/2).
      const maxTdzFt = Math.min(C.tdzLengthFt, lengthFt / 2);
      for (let d = C.tdzStartFt; d <= maxTdzFt; d += C.tdzBarSpacingFt) {
        const barCenter = coordinateFromVectorMeters({
          end: thresholdEnd,
          vector: vectorOut,
          distance: -ftToM(d),
        }) as Coordinate2D;
        for (const sideSign of [-1, 1]) {
          for (let k = 1; k <= C.tdzBarHalfCount; k += 1) {
            const lateral = sideSign * halfWidthMeters * 0.12 * k;
            features.push(
              feature(offsetCoordinate(barCenter, vectorOut, lateral), {
                role: "tdz",
                color: "white",
                runwayId: runway.id,
                runwayEnd: end.ident,
                side: sideSign < 0 ? "left" : "right",
                minBand: "near",
              }),
            );
          }
        }
      }

      // REIL: synchronized flashing white strobes flanking the threshold.
      for (const sideSign of [-1, 1]) {
        const lateral = sideSign * (halfWidthMeters + ftToM(C.reilOffsetFt));
        features.push(
          feature(offsetCoordinate(thresholdCoord, vectorOut, lateral), {
            role: "reil",
            color: "white",
            runwayId: runway.id,
            runwayEnd: end.ident,
            side: sideSign < 0 ? "left" : "right",
            flashing: true,
            minBand: "near",
          }),
        );
      }
    });
  }

  return features;
};

const emptyCollection = (runwayMap: LightRecord): LightRecord => ({
  type: "FeatureCollection",
  properties: {
    airport: runwayMap?.airport || "",
    source: runwayMap?.source || "Runway geometry",
    cycle: runwayMap?.cycle || "",
  },
  features: [],
});

// FAA runway lights for the given LOD band. `far` → no point lights (approach
// beams are rendered separately and survive the farthest zoom). `mid` → edge +
// threshold/end + ALS dots with a decimated centerline. `near` → full density
// including TDZL + REIL. Runways with `lighted === false` are skipped; unknown
// (`undefined`, e.g. OSM-derived) is treated as lighted.
export function buildRunwayFaaLightCollection(
  runwayMap: LightRecord,
  { band = "near" as RunwayLightingLodBand }: { band?: RunwayLightingLodBand } = {},
): LightRecord {
  if (band === "far") return emptyCollection(runwayMap);
  const includeNear = runwayLightingLodBandRank(band) >= runwayLightingLodBandRank("near");
  const decimateCenterline = band === "mid";

  const features = (runwayMap?.runways || [])
    .filter((runway: LightRecord) => runway?.lighted !== false)
    .flatMap((runway: LightRecord) =>
      runwayLightFeatures(runway, { includeNear, decimateCenterline }),
    );

  return {
    ...emptyCollection(runwayMap),
    features,
  };
}

// Taxiway lights from OSM surface geometry: green centerline (reliable) and
// blue edge (offset by an assumed half-width, since OSM rarely carries taxiway
// width). Near band only — taxiway lights are the densest, lowest-value layer
// when zoomed out.
export function buildTaxiwayLightCollection(
  surfaceCollection: LightRecord,
  { band = "near" as RunwayLightingLodBand }: { band?: RunwayLightingLodBand } = {},
): LightRecord {
  const base: LightRecord = {
    type: "FeatureCollection",
    properties: { source: "Taxiway lighting" },
    features: [],
  };
  if (runwayLightingLodBandRank(band) < runwayLightingLodBandRank("near")) {
    return base;
  }

  const halfWidthMeters = ftToM(C.taxiwayDefaultHalfWidthFt);
  const features: LightRecord[] = [];

  for (const taxiway of surfaceCollection?.features || []) {
    const kind = String(taxiway?.properties?.kind || "");
    if (kind !== "taxiway" && kind !== "taxilane") continue;
    if (taxiway?.geometry?.type !== "LineString") continue;
    const coordinates = (taxiway.geometry.coordinates || []) as Coordinate2D[];

    const greenCenterline = sampleAlongPolyline(coordinates, ftToM(C.taxiwayCenterlineSpacingFt));
    greenCenterline.samples.forEach((sample) => {
      features.push(
        feature(sample.coordinate, {
          role: "taxiway-centerline",
          color: "green",
          side: "center",
          lightIndex: sample.index,
          minBand: "near",
        }),
      );
    });

    const blueEdge = sampleAlongPolyline(coordinates, ftToM(C.taxiwayEdgeSpacingFt));
    blueEdge.samples.forEach((sample) => {
      for (const sideSign of [-1, 1]) {
        features.push(
          feature(offsetCoordinate(sample.coordinate, sample.vector, halfWidthMeters * sideSign), {
            role: "taxiway-edge",
            color: "blue",
            side: sideSign < 0 ? "left" : "right",
            lightIndex: sample.index,
            minBand: "near",
          }),
        );
      }
    });
  }

  return { ...base, features };
}
