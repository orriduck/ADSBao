import * as THREE from "three";
import { airportDisplayCode } from "@/utils/airport";
import { buildNavaidLabels } from "./navaidLabelModel";
import { buildReportingPointLabels } from "./reportingPointLabelModel";
import { lonLatAltitudeToThreeOsmWorld, type TileCoordinate } from "./threeOsmProjection";

const FOCAL_AIRPORT_COLOR = 0xf5c542;

export type ThreeOsmSceneLabel = {
  id: string;
  text: string;
  kind:
    | "aircraft"
    | "airport"
    | "focal-airport"
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
  priority: number;
};

function addContextPointInstances({
  group,
  labels,
  items,
  geometry,
  tileCenter,
  centerLat,
  theme,
}: {
  group: THREE.Group;
  labels: ThreeOsmSceneLabel[];
  items: ContextPoint[];
  geometry: THREE.BufferGeometry;
  tileCenter: TileCoordinate;
  centerLat: number;
  theme: string;
}) {
  if (!items.length) {
    geometry.dispose();
    return 0;
  }
  const mesh = new THREE.InstancedMesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: theme === "light" ? 0x3c3e3c : 0xd2d0ca,
    }),
    items.length,
  );
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  let rendered = 0;
  items.forEach((item, index) => {
    const point = lonLatAltitudeToThreeOsmWorld({
      lon: item.lon,
      lat: item.lat,
      center: tileCenter,
      centerLat,
    });
    if (!point) return;
    position.set(point.x, 4, point.z);
    scale.setScalar(item.selected ? 1.5 : 1);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(
      index,
      new THREE.Color(
        item.selected
          ? theme === "light"
            ? 0x414341
            : 0xb7bab7
          : theme === "light"
            ? 0x3c3e3c
            : 0xd2d0ca,
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
    rendered += 1;
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.name = `three-osm-${items[0]?.kind || "context"}-markers`;
  group.add(mesh);
  return rendered;
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
  selectedNavaidKey,
  selectedReportingPointKey,
  selectedCandidateWatchingSpotId,
  userLocation,
  tileCenter,
  centerLat,
  theme,
  locale = "en",
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
  selectedNavaidKey: string;
  selectedReportingPointKey: string;
  selectedCandidateWatchingSpotId: string;
  userLocation: Record<string, any> | null;
  tileCenter: TileCoordinate;
  centerLat: number;
  theme: string;
  locale?: string;
}) {
  const group = new THREE.Group();
  group.name = "three-osm-operational-context";
  const labels: ThreeOsmSceneLabel[] = [];

  const focalMarker = new THREE.Mesh(
    new THREE.CylinderGeometry(5, 5, 18, 12),
    new THREE.MeshBasicMaterial({ color: FOCAL_AIRPORT_COLOR }),
  );
  focalMarker.position.set(0, 9, 0);
  group.add(focalMarker);
  const focalRing = new THREE.Mesh(
    new THREE.RingGeometry(8, 10, 28),
    new THREE.MeshBasicMaterial({
      color: FOCAL_AIRPORT_COLOR,
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
    color: theme === "light" ? 0x252725 : 0xe4e1d8,
  });
  const airportMesh = new THREE.InstancedMesh(
    airportGeometry,
    airportMaterial,
    airports.length,
  );
  const airportMatrix = new THREE.Matrix4();
  const airportPosition = new THREE.Vector3();
  airports.forEach((item, index) => {
    const point = lonLatAltitudeToThreeOsmWorld({
      lon: item?.lon,
      lat: item?.lat,
      center: tileCenter,
      centerLat,
    });
    if (!point) return;
    airportPosition.set(point.x, 5, point.z);
    airportMatrix.makeTranslation(airportPosition);
    airportMesh.setMatrixAt(index, airportMatrix);
    const code = airportDisplayCode(item);
    if (code) {
      labels.push({
        id: `airport:${code}:${index}`,
        text: code,
        kind: "airport",
        position: airportPosition.clone().setY(10),
        priority: 650 - Math.hypot(point.x, point.z) / 10,
      });
    }
  });
  airportMesh.instanceMatrix.needsUpdate = true;
  airportMesh.computeBoundingSphere();
  group.add(airportMesh);

  const runwaySegments: number[] = [];
  for (const feature of runwayCollection?.features || []) {
    const coordinates = feature?.geometry?.coordinates;
    if (!Array.isArray(coordinates)) continue;
    for (let index = 1; index < coordinates.length; index += 1) {
      const from = coordinates[index - 1];
      const to = coordinates[index];
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
      runwaySegments.push(fromPoint.x, 1.8, fromPoint.z, toPoint.x, 1.8, toPoint.z);
    }
  }
  if (runwaySegments.length) {
    const runwayGeometry = new THREE.BufferGeometry();
    runwayGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(runwaySegments, 3),
    );
    group.add(
      new THREE.LineSegments(
        runwayGeometry,
        new THREE.LineBasicMaterial({
          color: theme === "light" ? 0x1d1e1d : 0xf4f1e8,
          opacity: 0.95,
          transparent: true,
        }),
      ),
    );
  }

  const airspaceSegments: number[] = [];
  if (showAirspaces) {
    for (const feature of airspaceFeatures) {
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
        }
      }
    }
  }
  if (airspaceSegments.length) {
    const airspaceGeometry = new THREE.BufferGeometry();
    airspaceGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(airspaceSegments, 3),
    );
    const airspaceLines = new THREE.LineSegments(
      airspaceGeometry,
      new THREE.LineDashedMaterial({
        color: theme === "light" ? 0x515451 : 0xc6c9c6,
        opacity: 0.72,
        transparent: true,
        dashSize: 4,
        gapSize: 4,
      }),
    );
    airspaceLines.computeLineDistances();
    airspaceLines.name = "three-osm-airspace-boundaries";
    group.add(airspaceLines);
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
          priority: 430,
        }));
  const navaidCount = addContextPointInstances({
    group,
    labels,
    items: navaidItems,
    geometry: new THREE.OctahedronGeometry(2.5, 0),
    tileCenter,
    centerLat,
    theme,
  });

  const reportingItems: ContextPoint[] = showReportingPoints
    ? buildReportingPointLabels(reportingPoints).map((item: any) => ({
        id: item.key,
        label: item.name,
        lat: item.lat,
        lon: item.lon,
        kind: "reporting" as const,
        selected: item.key === selectedReportingPointKey,
        priority: 410,
      }))
    : [];
  const reportingCount = addContextPointInstances({
    group,
    labels,
    items: reportingItems,
    geometry: new THREE.ConeGeometry(2.8, 5, 3),
    tileCenter,
    centerLat,
    theme,
  });

  const spotItems: ContextPoint[] = showCandidateWatchingSpots
    ? candidateWatchingSpots.flatMap((item, index) => {
        const label = String(item?.name || item?.title || "Spot").trim();
        if (!label) return [];
        const id = String(item?.id || index);
        return [{
          id,
          label,
          lat: item?.lat,
          lon: item?.lon,
          kind: "spot" as const,
          selected: id === selectedCandidateWatchingSpotId,
          priority: 400,
        }];
      })
    : [];
  const spotCount = addContextPointInstances({
    group,
    labels,
    items: spotItems,
    geometry: new THREE.SphereGeometry(2.2, 8, 6),
    tileCenter,
    centerLat,
    theme,
  });

  let userLocationCount = 0;
  const userPoint = userLocation
    ? lonLatAltitudeToThreeOsmWorld({
        lon: userLocation.lon,
        lat: userLocation.lat,
        center: tileCenter,
        centerLat,
      })
    : null;
  if (userPoint) {
    const marker = new THREE.Mesh(
      new THREE.TorusGeometry(5, 1.2, 8, 24),
      new THREE.MeshBasicMaterial({
        color: theme === "light" ? 0x414341 : 0xd7d9d7,
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
    counts: {
      airports: airports.length,
      runways: runwayCollection?.features?.length || 0,
      airspaces: showAirspaces ? airspaceFeatures.length : 0,
      navaids: navaidCount,
      reportingPoints: reportingCount,
      spots: spotCount,
      userLocation: userLocationCount,
    },
  };
}
