import * as THREE from "three";
import type {
  ThreeOsmRoadTier,
  ThreeOsmVectorContextGeometry,
} from "./threeOsmVectorContextGeometry";
import type { ThreeOsmSceneLabel } from "./threeOsmSceneContext";

function createBasicMesh(
  positions: Float32Array,
  color: number,
  name: string,
  renderOrder: number,
  opacity = 1,
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
    }),
  );
  mesh.name = name;
  mesh.renderOrder = renderOrder;
  return mesh;
}

export function createThreeOsmVectorContextScene({
  geometry,
  theme,
}: {
  geometry: ThreeOsmVectorContextGeometry;
  theme: string;
}) {
  const group = new THREE.Group();
  group.name = "three-osm-vector-context";
  const dark = theme !== "light";
  const roadColors: Record<ThreeOsmRoadTier, number> = dark
    ? { major: 0xb8bfbb, minor: 0x777e7a, service: 0x555b58 }
    : { major: 0x3f4643, minor: 0x686f6c, service: 0x858b88 };
  (["service", "minor", "major"] as ThreeOsmRoadTier[]).forEach(
    (tier, index) => {
      const positions = geometry.roadPositions[tier];
      if (!positions.length) return;
      group.add(
        createBasicMesh(
          positions,
          roadColors[tier],
          `three-osm-vector-road-${tier}`,
          1 + index,
          0.42,
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
