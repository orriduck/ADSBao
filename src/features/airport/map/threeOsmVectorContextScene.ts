import * as THREE from "three";
import type {
  ThreeOsmVectorContextGeometry,
} from "./threeOsmVectorContextGeometry";
import type { ThreeOsmSceneLabel } from "./threeOsmSceneContext";
import {
  THREE_OSM_ROAD_TIERS,
  type ThreeOsmRoadTier,
} from "./threeOsmVectorRoadModel";
import type { ThreeOsmVectorSurfaceKind } from "./threeOsmVectorSurfaceModel";
import { resolveThreeOsmSceneSemanticLod } from "./threeOsmSceneSemanticLod";

function createBasicMesh(
  positions: Float32Array,
  color: number,
  name: string,
  renderOrder: number,
  opacity = 1,
  polygonOffset = false,
) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      opacity,
      transparent: opacity < 1,
      depthWrite: opacity >= 1,
      polygonOffset,
      polygonOffsetFactor: polygonOffset ? -2 : 0,
      polygonOffsetUnits: polygonOffset ? -4 : 0,
    }),
  );
  mesh.name = name;
  mesh.renderOrder = renderOrder;
  return mesh;
}

export function createThreeOsmVectorContextScene({
  geometry,
  theme,
  sourceZoom,
}: {
  geometry: ThreeOsmVectorContextGeometry;
  theme: string;
  sourceZoom: number;
}) {
  const group = new THREE.Group();
  group.name = "three-osm-vector-context";
  const dark = theme !== "light";
  const semanticLod = resolveThreeOsmSceneSemanticLod(sourceZoom);
  const surfaceStyles: Record<
    ThreeOsmVectorSurfaceKind,
    { color: number; opacity: number }
  > = dark
    ? {
        water: { color: 0x344246, opacity: 0.86 },
        natural: { color: 0x242a26, opacity: 0.68 },
        developed: { color: 0x2a2a28, opacity: 0.56 },
        aeroway: { color: 0x41413e, opacity: 0.76 },
      }
    : {
        water: { color: 0xc4d2d4, opacity: 0.88 },
        natural: { color: 0xd7ddd2, opacity: 0.68 },
        developed: { color: 0xdfddd7, opacity: 0.56 },
        aeroway: { color: 0xc6c6bf, opacity: 0.76 },
      };
  (["water", "natural", "developed", "aeroway"] as const).forEach(
    (kind, index) => {
      const positions = geometry.surfacePositions[kind];
      if (!positions.length) return;
      const style = surfaceStyles[kind];
      group.add(
        createBasicMesh(
          positions,
          style.color,
          `three-osm-vector-surface-${kind}`,
          -4 + index,
          style.opacity,
          true,
        ),
      );
    },
  );
  const roadStyles: Record<
    ThreeOsmRoadTier,
    { color: number; opacity: number }
  > = dark
    ? {
        motorway: { color: 0xd7ddd8, opacity: 0.64 },
        arterial: { color: 0xa7aeaa, opacity: 0.54 },
        collector: { color: 0x777e7a, opacity: 0.43 },
        local: { color: 0x5f6662, opacity: 0.34 },
        service: { color: 0x4d534f, opacity: 0.28 },
      }
    : {
        motorway: { color: 0x2e3431, opacity: 0.68 },
        arterial: { color: 0x4b524f, opacity: 0.58 },
        collector: { color: 0x686f6c, opacity: 0.48 },
        local: { color: 0x7b827f, opacity: 0.38 },
        service: { color: 0x8e9491, opacity: 0.3 },
      };
  [...THREE_OSM_ROAD_TIERS].reverse().forEach(
    (tier, index) => {
      const positions = geometry.roadPositions[tier];
      if (!positions.length) return;
      const style = roadStyles[tier];
      group.add(
        createBasicMesh(
          positions,
          style.color,
          `three-osm-vector-road-${tier}`,
          1 + index,
          style.opacity * semanticLod.roadStrength,
        ),
      );
    },
  );
  if (geometry.buildingWallPositions.length) {
    group.add(
      createBasicMesh(
        geometry.buildingWallPositions,
        dark ? 0x403c34 : 0x766f5d,
        "three-osm-vector-building-walls",
        4,
      ),
    );
  }
  if (geometry.buildingRoofPositions.length) {
    group.add(
      createBasicMesh(
        geometry.buildingRoofPositions,
        dark ? 0x8d8264 : 0xb7ad91,
        "three-osm-vector-building-roofs",
        5,
      ),
    );
  }
  const labels: ThreeOsmSceneLabel[] = geometry.labels.map((label) => ({
    id: label.id,
    text: label.text,
    kind: `vector-${label.kind}`,
    position: new THREE.Vector3(
      label.x,
      label.kind === "aerodrome"
        ? 5
        : label.kind === "place"
          ? 2.5
          : label.kind === "road"
            ? 1.4
            : 1.2,
      label.z,
    ),
    priority: label.priority,
  }));
  return { group, labels, ...geometry.diagnostics };
}
