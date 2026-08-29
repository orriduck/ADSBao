import * as THREE from "three";
import { airportDisplayCode } from "@/utils/airport";
import { buildNavaidLabels } from "./navaidLabelModel";
import { buildReportingPointLabels } from "./reportingPointLabelModel";
import {
  resolveThreeOsmVisualPalette,
  type ThreeOsmContrastMode,
  type ThreeOsmSystemColors,
  type ThreeOsmVisualPalette,
} from "./threeOsmAccessibilityPreferences";
import { lonLatAltitudeToThreeOsmWorld, type TileCoordinate } from "./threeOsmProjection";
import { createThreeOsmRunwayScene } from "./threeOsmRunwayScene";

export type ThreeOsmSceneLabel = {
  id: string;
  text: string;
  kind:
    | "aircraft"
    | "airport"
    | "focal-airport"
    | "airspace"
    | "navaid"
    | "reporting"
    | "spot";
  position: THREE.Vector3;
  priority: number;
  selected?: boolean;
};

type ContextPoint = {
  id: string;
  label: string;
  lat: unknown;
  lon: unknown;
  kind: "navaid" | "reporting" | "spot";
  selected: boolean;
  selectable: boolean;
  priority: number;
};

export type ThreeOsmContextSelection = {
  kind: "airport" | "navaid" | "reporting" | "spot";
  id: string;
};

export type ThreeOsmContextPickTarget = ThreeOsmContextSelection & {
  position: THREE.Vector3;
};

export function resolveThreeOsmContextScreenHit({
  targets,
  camera,
  width,
  height,
  x,
  y,
  radiusPx = 14,
}: {
  targets: ThreeOsmContextPickTarget[];
  camera: THREE.Camera;
  width: number;
  height: number;
  x: number;
  y: number;
  radiusPx?: number;
}) {
  if (width <= 0 || height <= 0 || radiusPx <= 0) return null;
  const projected = new THREE.Vector3();
  let nearest: ThreeOsmContextSelection | null = null;
  let nearestDistanceSquared = radiusPx * radiusPx;
  for (const target of targets) {
    projected.copy(target.position).project(camera);
    if (projected.z < -1 || projected.z > 1) continue;
    const screenX = (projected.x * 0.5 + 0.5) * width;
    const screenY = (-projected.y * 0.5 + 0.5) * height;
    const distanceSquared = (screenX - x) ** 2 + (screenY - y) ** 2;
    if (distanceSquared >= nearestDistanceSquared) continue;
    nearestDistanceSquared = distanceSquared;
    nearest = { kind: target.kind, id: target.id };
  }
  return nearest;
}

function finiteCoordinate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function addContextPointInstances({
  group,
  labels,
  items,
  geometry,
  tileCenter,
  centerLat,
  palette,
}: {
  group: THREE.Group;
  labels: ThreeOsmSceneLabel[];
  items: ContextPoint[];
  geometry: THREE.BufferGeometry;
  tileCenter: TileCoordinate;
  centerLat: number;
  palette: ThreeOsmVisualPalette;
}) {
  if (!items.length) {
    geometry.dispose();
    return { count: 0, pickTargets: [] as ThreeOsmContextPickTarget[] };
  }
  const mesh = new THREE.InstancedMesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: palette.contextMarker,
    }),
    items.length,
  );
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const pickTargets: ThreeOsmContextPickTarget[] = [];
  let rendered = 0;
  items.forEach((item) => {
    const lat = finiteCoordinate(item.lat);
    const lon = finiteCoordinate(item.lon);
    if (lat === null || lon === null) return;
    const point = lonLatAltitudeToThreeOsmWorld({
      lon,
      lat,
      center: tileCenter,
      centerLat,
    });
    if (!point) return;
    position.set(point.x, 4, point.z);
    scale.setScalar(item.selected ? 1.5 : 1);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(rendered, matrix);
    mesh.setColorAt(
      rendered,
      new THREE.Color(
        item.selected
          ? palette.selectedContextMarker
          : palette.contextMarker,
      ),
    );
    labels.push({
      id: `${item.kind}:${item.id}`,
      text: item.label,
      kind: item.kind,
      position: position.clone().setY(9),
      priority: item.selected ? 850 : item.priority,
      selected: item.selected,
    });
    if (item.selectable) {
      pickTargets.push({
        kind: item.kind,
        id: item.id,
        position: position.clone(),
      });
    }
    rendered += 1;
  });
  mesh.count = rendered;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.name = `three-osm-${items[0]?.kind || "context"}-markers`;
  group.add(mesh);
  return { count: rendered, pickTargets };
}

export function collectAirspaceLineCoordinates(geometry: Record<string, any> | null) {
  if (!geometry) return [] as number[][][];
  if (geometry.type === "Polygon") {
    return Array.isArray(geometry.coordinates) ? geometry.coordinates : [];
  }
  if (geometry.type === "MultiPolygon") {
    return Array.isArray(geometry.coordinates)
      ? geometry.coordinates.flatMap((polygon: unknown) =>
          Array.isArray(polygon) ? polygon : [],
        )
      : [];
  }
  return [] as number[][][];
}

export function resolveThreeOsmAirspaceHitIds(
  intersections: Array<{ index?: number | null; object?: THREE.Object3D }> = [],
) {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const intersection of intersections) {
    const index = Number(intersection?.index);
    if (!Number.isInteger(index) || index < 0) continue;
    const segmentIds = intersection.object?.userData?.airspaceSegmentIds;
    if (!Array.isArray(segmentIds)) continue;
    const id = String(segmentIds[Math.floor(index / 2)] || "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

export function createThreeOsmContextScene({
  airportCode,
  airports,
  runwayCollection,
  airspaceFeatures,
  showAirspaces,
  navaids,
  navaidCounts,
  useNavaidCounts,
  reportingPoints,
  candidateWatchingSpots,
  showNavaidMarkers,
  showReportingPoints,
  showCandidateWatchingSpots,
  selectedAirportIcao,
  selectedNavaidKey,
  selectedReportingPointKey,
  selectedCandidateWatchingSpotId,
  userLocation,
  tileCenter,
  centerLat,
  theme,
  contrastMode,
  systemColors = null,
  locale = "en",
  selectedAirspaceId = "",
}: {
  airportCode: string;
  airports: Array<Record<string, any>>;
  runwayCollection: Record<string, any> | null;
  airspaceFeatures: Array<Record<string, any>>;
  showAirspaces: boolean;
  navaids: Array<Record<string, any>>;
  navaidCounts: Array<Record<string, any>>;
  useNavaidCounts: boolean;
  reportingPoints: Array<Record<string, any>>;
  candidateWatchingSpots: Array<Record<string, any>>;
  showNavaidMarkers: boolean;
  showReportingPoints: boolean;
  showCandidateWatchingSpots: boolean;
  selectedAirportIcao: string;
  selectedNavaidKey: string;
  selectedReportingPointKey: string;
  selectedCandidateWatchingSpotId: string;
  userLocation: Record<string, any> | null;
  tileCenter: TileCoordinate;
  centerLat: number;
  theme: string;
  contrastMode: ThreeOsmContrastMode;
  systemColors?: ThreeOsmSystemColors | null;
  locale?: string;
  selectedAirspaceId?: string;
}) {
  const group = new THREE.Group();
  group.name = "three-osm-operational-context";
  const labels: ThreeOsmSceneLabel[] = [];
  const palette = resolveThreeOsmVisualPalette({
    theme,
    contrastMode,
    systemColors,
  });

  const focalMarker = new THREE.Mesh(
    new THREE.CylinderGeometry(5, 5, 18, 12),
    new THREE.MeshBasicMaterial({ color: palette.focalAirport }),
  );
  focalMarker.position.set(0, 9, 0);
  group.add(focalMarker);
  const focalRing = new THREE.Mesh(
    new THREE.RingGeometry(8, 10, 28),
    new THREE.MeshBasicMaterial({
      color: palette.focalAirport,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    }),
  );
  focalRing.rotation.x = -Math.PI / 2;
  focalRing.position.y = 1.5;
  group.add(focalRing);
  if (airportCode) {
    labels.push({
      id: `focal-airport:${airportCode}`,
      text: airportCode,
      kind: "focal-airport",
      position: new THREE.Vector3(0, 24, 0),
      priority: 1_000,
    });
  }

  const airportGeometry = new THREE.OctahedronGeometry(4, 0);
  const airportMaterial = new THREE.MeshBasicMaterial({
    color: palette.airportMarker,
  });
  const airportMesh = new THREE.InstancedMesh(
    airportGeometry,
    airportMaterial,
    airports.length,
  );
  const airportMatrix = new THREE.Matrix4();
  const airportPosition = new THREE.Vector3();
  const airportQuaternion = new THREE.Quaternion();
  const airportScale = new THREE.Vector3();
  const airportPickTargets: ThreeOsmContextPickTarget[] = [];
  let airportCount = 0;
  airports.forEach((item) => {
    const lat = finiteCoordinate(item?.lat);
    const lon = finiteCoordinate(item?.lon);
    if (lat === null || lon === null) return;
    const point = lonLatAltitudeToThreeOsmWorld({
      lon,
      lat,
      center: tileCenter,
      centerLat,
    });
    if (!point) return;
    const code = airportDisplayCode(item);
    if (!code) return;
    const selectionId = String(item?.icao || "").trim().toUpperCase();
    const selected = Boolean(
      selectionId && selectionId === selectedAirportIcao,
    );
    airportPosition.set(point.x, 5, point.z);
    airportScale.setScalar(selected ? 1.5 : 1);
    airportMatrix.compose(airportPosition, airportQuaternion, airportScale);
    airportMesh.setMatrixAt(airportCount, airportMatrix);
    airportMesh.setColorAt(
      airportCount,
      new THREE.Color(
        selected
          ? palette.selectedContextMarker
          : palette.airportMarker,
      ),
    );
    if (selectionId) {
      airportPickTargets.push({
        kind: "airport",
        id: selectionId,
        position: airportPosition.clone(),
      });
    }
    labels.push({
      id: `airport:${code}:${airportCount}`,
      text: code,
      kind: "airport",
      position: airportPosition.clone().setY(10),
      priority: selected ? 850 : 650 - Math.hypot(point.x, point.z) / 10,
      selected,
    });
    airportCount += 1;
  });
  airportMesh.count = airportCount;
  airportMesh.instanceMatrix.needsUpdate = true;
  if (airportMesh.instanceColor) airportMesh.instanceColor.needsUpdate = true;
  airportMesh.computeBoundingSphere();
  airportMesh.name = "three-osm-airport-markers";
  group.add(airportMesh);

  const runwayScene = createThreeOsmRunwayScene({
    runwayCollection,
    tileCenter,
    centerLat,
    palette,
    contrastMode,
  });
  group.add(runwayScene.group);

  const airspaceSegments: number[] = [];
  const selectedAirspaceSegments: number[] = [];
  const airspaceSegmentIds: string[] = [];
  let selectedAirspaceCount = 0;
  if (showAirspaces) {
    for (const feature of airspaceFeatures) {
      const featureId = String(feature?.properties?.id || "");
      const selected = Boolean(featureId && featureId === selectedAirspaceId);
      let minX = Infinity;
      let minZ = Infinity;
      let maxX = -Infinity;
      let maxZ = -Infinity;
      for (const ring of collectAirspaceLineCoordinates(feature?.geometry)) {
        for (let index = 1; index < ring.length; index += 1) {
          const from = ring[index - 1];
          const to = ring[index];
          const fromPoint = lonLatAltitudeToThreeOsmWorld({
            lon: from?.[0],
            lat: from?.[1],
            center: tileCenter,
            centerLat,
          });
          const toPoint = lonLatAltitudeToThreeOsmWorld({
            lon: to?.[0],
            lat: to?.[1],
            center: tileCenter,
            centerLat,
          });
          if (!fromPoint || !toPoint) continue;
          airspaceSegments.push(fromPoint.x, 2.4, fromPoint.z, toPoint.x, 2.4, toPoint.z);
          airspaceSegmentIds.push(featureId);
          minX = Math.min(minX, fromPoint.x, toPoint.x);
          minZ = Math.min(minZ, fromPoint.z, toPoint.z);
          maxX = Math.max(maxX, fromPoint.x, toPoint.x);
          maxZ = Math.max(maxZ, fromPoint.z, toPoint.z);
          if (selected) {
            selectedAirspaceSegments.push(
              fromPoint.x,
              3.2,
              fromPoint.z,
              toPoint.x,
              3.2,
              toPoint.z,
            );
          }
        }
      }
      if (selected && Number.isFinite(minX) && Number.isFinite(minZ)) {
        const name = String(feature?.properties?.name || "Airspace").trim();
        const classLabel = String(feature?.properties?.classLabel || "").trim();
        labels.push({
          id: `airspace:${featureId}`,
          text: classLabel ? `${name} · ${classLabel}` : name,
          kind: "airspace",
          position: new THREE.Vector3((minX + maxX) / 2, 8, (minZ + maxZ) / 2),
          priority: 880,
          selected: true,
        });
        selectedAirspaceCount += 1;
      }
    }
  }
  let airspaceHitObject: THREE.LineSegments | null = null;
  if (airspaceSegments.length) {
    const airspaceGeometry = new THREE.BufferGeometry();
    airspaceGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(airspaceSegments, 3),
    );
    const airspaceLines = new THREE.LineSegments(
      airspaceGeometry,
      new THREE.LineDashedMaterial({
        color: palette.airspace,
        opacity: palette.lineOpacity,
        transparent: true,
        dashSize: 4,
        gapSize: 4,
      }),
    );
    airspaceLines.computeLineDistances();
    airspaceLines.name = "three-osm-airspace-boundaries";
    airspaceLines.userData.airspaceSegmentIds = airspaceSegmentIds;
    group.add(airspaceLines);
    airspaceHitObject = airspaceLines;
  }
  if (selectedAirspaceSegments.length) {
    const selectedGeometry = new THREE.BufferGeometry();
    selectedGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(selectedAirspaceSegments, 3),
    );
    const selectedLines = new THREE.LineSegments(
      selectedGeometry,
      new THREE.LineBasicMaterial({
        color: palette.selectedAirspace,
        opacity: 1,
        transparent: true,
      }),
    );
    selectedLines.name = "three-osm-selected-airspace-boundary";
    selectedLines.renderOrder = 46;
    group.add(selectedLines);
  }

  const navaidItems: ContextPoint[] = !showNavaidMarkers
    ? []
    : useNavaidCounts
      ? navaidCounts.flatMap((item, index) => {
          const count = Math.trunc(Number(item?.count));
          if (count <= 0) return [];
          return [{
            id: String(item?.key || index),
            label: locale === "zh-CN" ? `${count} 导航台` : `${count} NAV`,
            lat: item?.lat,
            lon: item?.lon,
            kind: "navaid" as const,
            selected: false,
            selectable: false,
            priority: 420,
          }];
        })
      : buildNavaidLabels(navaids).map((item: any) => ({
          id: item.key,
          label: item.ident,
          lat: item.lat,
          lon: item.lon,
          kind: "navaid" as const,
          selected: item.key === selectedNavaidKey,
          selectable: true,
          priority: 430,
        }));
  const navaidResult = addContextPointInstances({
    group,
    labels,
    items: navaidItems,
    geometry: new THREE.OctahedronGeometry(2.5, 0),
    tileCenter,
    centerLat,
    palette,
  });

  const reportingItems: ContextPoint[] = showReportingPoints
    ? buildReportingPointLabels(reportingPoints).map((item: any) => ({
        id: item.key,
        label: item.name,
        lat: item.lat,
        lon: item.lon,
        kind: "reporting" as const,
        selected: item.key === selectedReportingPointKey,
        selectable: true,
        priority: 410,
      }))
    : [];
  const reportingResult = addContextPointInstances({
    group,
    labels,
    items: reportingItems,
    geometry: new THREE.ConeGeometry(2.8, 5, 3),
    tileCenter,
    centerLat,
    palette,
  });

  const spotItems: ContextPoint[] = showCandidateWatchingSpots
    ? candidateWatchingSpots.flatMap((item, index) => {
        const label = String(item?.name || item?.title || "Spot").trim();
        if (!label) return [];
        const selectionId = String(item?.id || "").trim();
        const id = selectionId || `spot-${index}`;
        return [{
          id,
          label,
          lat: item?.lat,
          lon: item?.lon,
          kind: "spot" as const,
          selected: Boolean(
            selectionId && selectionId === selectedCandidateWatchingSpotId,
          ),
          selectable: Boolean(selectionId),
          priority: 400,
        }];
      })
    : [];
  const spotResult = addContextPointInstances({
    group,
    labels,
    items: spotItems,
    geometry: new THREE.SphereGeometry(2.2, 8, 6),
    tileCenter,
    centerLat,
    palette,
  });

  let userLocationCount = 0;
  const userLat = finiteCoordinate(userLocation?.lat);
  const userLon = finiteCoordinate(userLocation?.lon);
  const userPoint = userLat !== null && userLon !== null
    ? lonLatAltitudeToThreeOsmWorld({
        lon: userLon,
        lat: userLat,
        center: tileCenter,
        centerLat,
      })
    : null;
  if (userPoint) {
    const marker = new THREE.Mesh(
      new THREE.TorusGeometry(5, 1.2, 8, 24),
      new THREE.MeshBasicMaterial({
        color: palette.userLocation,
      }),
    );
    marker.rotation.x = Math.PI / 2;
    marker.position.set(userPoint.x, 3, userPoint.z);
    marker.name = "three-osm-user-location";
    group.add(marker);
    userLocationCount = 1;
  }

  return {
    group,
    labels,
    airspaceHitObject,
    contextPickTargets: [
      ...airportPickTargets,
      ...navaidResult.pickTargets,
      ...reportingResult.pickTargets,
      ...spotResult.pickTargets,
    ],
    counts: {
      airports: airportCount,
      runways: runwayScene.runwayCount,
      airspaces: showAirspaces ? airspaceFeatures.length : 0,
      selectedAirspaces: selectedAirspaceCount,
      navaids: navaidResult.count,
      reportingPoints: reportingResult.count,
      spots: spotResult.count,
      userLocation: userLocationCount,
    },
    runwayDiagnostics: {
      segments: runwayScene.segmentCount,
      vertices: runwayScene.vertexCount,
    },
  };
}
