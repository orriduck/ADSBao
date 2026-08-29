import * as THREE from "three";

export type ThreeOsmCameraMode = "2d" | "3d";

type Vector3Tuple = [number, number, number];
type QuaternionTuple = [number, number, number, number];

export type ThreeOsmCameraSnapshot = {
  mode: ThreeOsmCameraMode;
  scopeKey: string;
  position: Vector3Tuple;
  quaternion: QuaternionTuple;
  up: Vector3Tuple;
  target: Vector3Tuple;
  zoom: number;
};

function finiteTuple(values: number[]) {
  return values.every(Number.isFinite);
}

function cameraMode(camera: THREE.Camera): ThreeOsmCameraMode | null {
  if (camera instanceof THREE.OrthographicCamera) return "2d";
  if (camera instanceof THREE.PerspectiveCamera) return "3d";
  return null;
}

export function captureThreeOsmCameraSnapshot({
  camera,
  target,
  scopeKey,
}: {
  camera: THREE.Camera;
  target: THREE.Vector3;
  scopeKey: string;
}): ThreeOsmCameraSnapshot | null {
  const mode = cameraMode(camera);
  if (!mode || !scopeKey) return null;
  const zoom = camera instanceof THREE.OrthographicCamera ? camera.zoom : 1;
  const snapshot: ThreeOsmCameraSnapshot = {
    mode,
    scopeKey,
    position: camera.position.toArray(),
    quaternion: camera.quaternion.toArray(),
    up: camera.up.toArray(),
    target: target.toArray(),
    zoom,
  };
  return finiteTuple([
    ...snapshot.position,
    ...snapshot.quaternion,
    ...snapshot.up,
    ...snapshot.target,
    snapshot.zoom,
  ])
    ? snapshot
    : null;
}

export function restoreThreeOsmCameraSnapshot({
  camera,
  target,
  snapshot,
  scopeKey,
}: {
  camera: THREE.Camera;
  target: THREE.Vector3;
  snapshot: ThreeOsmCameraSnapshot | null | undefined;
  scopeKey: string;
}) {
  if (
    !snapshot ||
    snapshot.scopeKey !== scopeKey ||
    snapshot.mode !== cameraMode(camera) ||
    !finiteTuple([
      ...snapshot.position,
      ...snapshot.quaternion,
      ...snapshot.up,
      ...snapshot.target,
      snapshot.zoom,
    ]) ||
    snapshot.zoom <= 0
  ) {
    return false;
  }

  camera.position.fromArray(snapshot.position);
  camera.quaternion.fromArray(snapshot.quaternion).normalize();
  camera.up.fromArray(snapshot.up);
  target.fromArray(snapshot.target);
  if (camera instanceof THREE.OrthographicCamera) {
    camera.zoom = snapshot.zoom;
    camera.updateProjectionMatrix();
  }
  camera.updateMatrixWorld();
  return true;
}
