import * as THREE from "three";
import type { ThreeOsmViewportFootprint } from "./threeOsmTileWindow";

export function resolveThreeOsmCameraGroundFootprint({
  camera,
  target,
  visibleLeftNdc,
}: {
  camera: THREE.Camera;
  target: THREE.Vector3;
  visibleLeftNdc: number;
}): ThreeOsmViewportFootprint | null {
  if (camera instanceof THREE.OrthographicCamera) {
    const halfWidth = (camera.right - camera.left) / (2 * camera.zoom);
    const halfHeight = (camera.top - camera.bottom) / (2 * camera.zoom);
    return {
      minX: -halfWidth + (visibleLeftNdc + 1) * halfWidth,
      maxX: halfWidth,
      minZ: -halfHeight,
      maxZ: halfHeight,
    };
  }
  if (!(camera instanceof THREE.PerspectiveCamera)) return null;
  const middleX = (visibleLeftNdc + 1) / 2;
  const footprintSamples = [visibleLeftNdc, middleX, 1].flatMap((x) =>
    [-1, 0, 0.25, 0.5, 0.75, 0.95].map((y) => [x, y] as const),
  );
  const raycaster = new THREE.Raycaster();
  const offsets = footprintSamples.flatMap(([x, y]) => {
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
    const directionY = raycaster.ray.direction.y;
    if (directionY >= -0.0001) return [];
    const distance = -raycaster.ray.origin.y / directionY;
    if (!Number.isFinite(distance) || distance < 0) return [];
    const point = raycaster.ray.at(distance, new THREE.Vector3());
    return [{ x: point.x - target.x, z: point.z - target.z }];
  });
  if (!offsets.length) return null;
  return {
    minX: Math.min(...offsets.map((point) => point.x)),
    maxX: Math.max(...offsets.map((point) => point.x)),
    minZ: Math.min(...offsets.map((point) => point.z)),
    maxZ: Math.max(...offsets.map((point) => point.z)),
  };
}
