import * as THREE from "three";

export type ThreeOsmScreenTarget = {
  position: THREE.Vector3;
};

export function resolveThreeOsmNearestScreenTarget<
  Target extends ThreeOsmScreenTarget,
>({
  targets,
  camera,
  width,
  height,
  x,
  y,
  radiusPx,
}: {
  targets: Iterable<Target>;
  camera: THREE.Camera;
  width: number;
  height: number;
  x: number;
  y: number;
  radiusPx: number;
}) {
  if (width <= 0 || height <= 0 || radiusPx <= 0) return null;
  const projected = new THREE.Vector3();
  let nearest: Target | null = null;
  let nearestDistanceSquared = radiusPx * radiusPx;
  for (const target of targets) {
    projected.copy(target.position).project(camera);
    if (projected.z < -1 || projected.z > 1) continue;
    const screenX = (projected.x * 0.5 + 0.5) * width;
    const screenY = (-projected.y * 0.5 + 0.5) * height;
    const distanceSquared = (screenX - x) ** 2 + (screenY - y) ** 2;
    if (distanceSquared >= nearestDistanceSquared) continue;
    nearestDistanceSquared = distanceSquared;
    nearest = target;
  }
  return nearest;
}
