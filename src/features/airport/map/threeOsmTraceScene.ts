import * as THREE from "three";
import {
  lonLatAltitudeToThreeOsmWorld,
  type TileCoordinate,
} from "./threeOsmProjection";

type TraceRecord = {
  aircraftHex?: string | null;
  opacity?: number;
  tracePoints?: Array<Record<string, any>>;
};

export function createThreeOsmTraceScene({
  traces,
  tileCenter,
  centerLat,
  theme,
}: {
  traces: TraceRecord[];
  tileCenter: TileCoordinate;
  centerLat: number;
  theme: string;
}) {
  const group = new THREE.Group();
  group.name = "three-osm-selected-traces";
  let traceCount = 0;
  let pointCount = 0;

  traces.forEach((trace, traceIndex) => {
    const points = (trace.tracePoints || []).flatMap((point) => {
      const world = lonLatAltitudeToThreeOsmWorld({
        lon: point?.lon,
        lat: point?.lat,
        altitudeFt: point?.onGround ? 0 : point?.altitude,
        center: tileCenter,
        centerLat,
      });
      return world ? [new THREE.Vector3(world.x, Math.max(2.5, world.y), world.z)] : [];
    });
    if (points.length < 2) return;

    const opacity = Math.min(1, Math.max(0.18, Number(trace.opacity) || 1));
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({
        color:
          traceIndex === 0
            ? theme === "light"
              ? 0x353735
              : 0xd8dad8
            : theme === "light"
              ? 0x686b68
              : 0xa5a8a5,
        opacity,
        transparent: opacity < 1,
        depthTest: false,
      }),
    );
    line.name = `three-osm-trace:${trace.aircraftHex || traceIndex}`;
    group.add(line);

    const groundPoints = points.map((point) => new THREE.Vector3(point.x, 1.4, point.z));
    group.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(groundPoints),
        new THREE.LineBasicMaterial({
          color: theme === "light" ? 0x4d504d : 0xb9bcb9,
          opacity: opacity * 0.26,
          transparent: true,
          depthTest: false,
        }),
      ),
    );

    const head = points.at(-1);
    if (head && head.y > 3) {
      group.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(head.x, 1.4, head.z),
            head,
          ]),
          new THREE.LineBasicMaterial({
            color: theme === "light" ? 0x4d504d : 0xb9bcb9,
            opacity: opacity * 0.45,
            transparent: true,
            depthTest: false,
          }),
        ),
      );
    }
    traceCount += 1;
    pointCount += points.length;
  });

  return { group, traceCount, pointCount };
}
