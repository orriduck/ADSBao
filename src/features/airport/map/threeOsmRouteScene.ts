import * as THREE from "three";
import {
  lonLatAltitudeToThreeOsmWorld,
  type TileCoordinate,
} from "./threeOsmProjection";
import {
  resolveThreeOsmVisualPalette,
  type ThreeOsmContrastMode,
  type ThreeOsmSystemColors,
} from "./threeOsmAccessibilityPreferences";
import { buildThreeOsmDashedPolylineCorridor } from "./threeOsmCorridorGeometry";

type RoutePoint = [unknown, unknown];

function createRouteLine({
  points,
  color,
  width,
  opacity,
  name,
  renderOrder,
}: {
  points: THREE.Vector3[];
  color: number;
  width: number;
  opacity: number;
  name: string;
  renderOrder: number;
}) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      buildThreeOsmDashedPolylineCorridor({
        points,
        dash: 13,
        gap: 9,
        width,
        y: points[0]?.y || 1.8,
      }),
      3,
    ),
  );
  geometry.computeBoundingSphere();
  const line = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color,
      opacity,
      transparent: opacity < 1,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  line.name = name;
  line.renderOrder = renderOrder;
  return line;
}

export function createThreeOsmRouteScene({
  path,
  tileCenter,
  centerLat,
  theme,
  contrastMode,
  systemColors = null,
}: {
  path: RoutePoint[];
  tileCenter: TileCoordinate;
  centerLat: number;
  theme: string;
  contrastMode: ThreeOsmContrastMode;
  systemColors?: ThreeOsmSystemColors | null;
}) {
  const group = new THREE.Group();
  group.name = "three-osm-flight-route";
  const palette = resolveThreeOsmVisualPalette({
    theme,
    contrastMode,
    systemColors,
  });
  const points = (Array.isArray(path) ? path : []).flatMap((point) => {
    const world = lonLatAltitudeToThreeOsmWorld({
      lat: point?.[0],
      lon: point?.[1],
      altitudeFt: 0,
      center: tileCenter,
      centerLat,
    });
    return world ? [new THREE.Vector3(world.x, 1.8, world.z)] : [];
  });
  if (points.length < 2) return { group, pointCount: 0 };

  group.add(
    createRouteLine({
      points,
      color: palette.background,
      width: contrastMode === "standard" ? 8.8 : 10,
      opacity: contrastMode === "standard" ? 0.72 : 1,
      name: "three-osm-flight-route-glow",
      renderOrder: 45,
    }),
    createRouteLine({
      points,
      color: palette.route,
      width: contrastMode === "standard" ? 3.2 : 3.8,
      opacity: contrastMode === "standard" ? 0.92 : 1,
      name: "three-osm-flight-route-line",
      renderOrder: 46,
    }),
  );

  const destination = points.at(-1);
  if (destination) {
    const destinationRing = new THREE.Mesh(
      new THREE.RingGeometry(5.5, 7.5, 24),
      new THREE.MeshBasicMaterial({
        color: palette.route,
        opacity: palette.lineOpacity,
        transparent: true,
        depthTest: false,
        side: THREE.DoubleSide,
      }),
    );
    destinationRing.name = "three-osm-flight-route-destination";
    destinationRing.renderOrder = 47;
    destinationRing.position.copy(destination);
    destinationRing.rotation.x = -Math.PI / 2;
    group.add(destinationRing);
  }

  return { group, pointCount: points.length };
}
