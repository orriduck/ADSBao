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
  contrastMode,
  systemColors = null,
}: {
  traces: TraceRecord[];
  tileCenter: TileCoordinate;
  centerLat: number;
  theme: string;
  contrastMode: ThreeOsmContrastMode;
  systemColors?: ThreeOsmSystemColors | null;
}) {
  const group = new THREE.Group();
  group.name = "three-osm-selected-traces";
  const palette = resolveThreeOsmVisualPalette({
    theme,
    contrastMode,
    systemColors,
  });
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
            ? palette.tracePrimary
            : palette.traceSecondary,
        opacity: contrastMode === "standard" ? opacity : 1,
        transparent: contrastMode === "standard" && opacity < 1,
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
          color: palette.traceSecondary,
          opacity:
            contrastMode === "standard" ? opacity * 0.26 : palette.mutedLineOpacity,
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
            color: palette.traceSecondary,
            opacity:
              contrastMode === "standard" ? opacity * 0.45 : palette.lineOpacity,
            transparent: true,
            depthTest: true,
          }),
        ),
      );
    }
    traceCount += 1;
    pointCount += points.length;
  });

  return { group, traceCount, pointCount };
}
