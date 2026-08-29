import * as THREE from "three";
import {
  lonLatAltitudeToThreeOsmWorld,
  type TileCoordinate,
} from "./threeOsmProjection";

type RoutePoint = [unknown, unknown];

export function createThreeOsmRouteScene({
  path,
  tileCenter,
  centerLat,
  theme,
}: {
  path: RoutePoint[];
  tileCenter: TileCoordinate;
  centerLat: number;
  theme: string;
}) {
  const group = new THREE.Group();
  group.name = "three-osm-flight-route";
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

  const route = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineDashedMaterial({
      color: theme === "light" ? 0x4b4e4b : 0xc4c7c4,
      dashSize: 13,
      gapSize: 9,
      opacity: 0.68,
      transparent: true,
      depthTest: false,
    }),
  );
  route.name = "three-osm-flight-route-line";
  route.computeLineDistances();
  group.add(route);

  const destination = points.at(-1);
  if (destination) {
    const destinationRing = new THREE.Mesh(
      new THREE.RingGeometry(5.5, 7.5, 24),
      new THREE.MeshBasicMaterial({
        color: theme === "light" ? 0x4b4e4b : 0xc4c7c4,
        opacity: 0.72,
        transparent: true,
        depthTest: false,
        side: THREE.DoubleSide,
      }),
    );
    destinationRing.name = "three-osm-flight-route-destination";
    destinationRing.position.copy(destination);
    destinationRing.rotation.x = -Math.PI / 2;
    group.add(destinationRing);
  }

  return { group, pointCount: points.length };
}
