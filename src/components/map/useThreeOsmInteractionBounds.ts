import { useEffect, type MutableRefObject, type RefObject } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  clampThreeOsmCameraTarget,
  resolveThreeOsmMinimumOrthoZoom,
  resolveThreeOsmTileWorldBounds,
  type ThreeOsmGroundFootprint,
} from "@/features/airport/map/threeOsmInteractionBounds";
import type { TileCoordinate } from "@/features/airport/map/threeOsmProjection";

const FOOTPRINT_SAMPLES = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [0, 0],
  [1, 0],
] as const;

function resolveGroundFootprint(
  camera: THREE.Camera,
  target: THREE.Vector3,
): ThreeOsmGroundFootprint | null {
  if (camera instanceof THREE.OrthographicCamera) {
    const halfWidth = (camera.right - camera.left) / (2 * camera.zoom);
    const halfHeight = (camera.top - camera.bottom) / (2 * camera.zoom);
    return {
      minX: -halfWidth,
      maxX: halfWidth,
      minZ: -halfHeight,
      maxZ: halfHeight,
    };
  }
  if (!(camera instanceof THREE.PerspectiveCamera)) return null;
  const raycaster = new THREE.Raycaster();
  const offsets = FOOTPRINT_SAMPLES.flatMap(([x, y]) => {
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

export function useThreeOsmInteractionBounds({
  rootRef,
  activeCameraRef,
  controlsRef,
  requestRenderRef,
  tileCenter,
  visibleTiles,
  viewMode,
}: {
  rootRef: RefObject<HTMLElement | null>;
  activeCameraRef: MutableRefObject<THREE.Camera | null>;
  controlsRef: MutableRefObject<OrbitControls | null>;
  requestRenderRef: MutableRefObject<() => void>;
  tileCenter: TileCoordinate;
  visibleTiles: TileCoordinate[];
  viewMode: "2d" | "3d";
}) {
  useEffect(() => {
    const root = rootRef.current;
    const camera = activeCameraRef.current;
    const controls = controlsRef.current;
    const bounds = resolveThreeOsmTileWorldBounds({
      tiles: visibleTiles,
      center: tileCenter,
    });
    if (!root || !camera || !controls || !bounds) return;

    if (camera instanceof THREE.OrthographicCamera) {
      const minimumZoom = resolveThreeOsmMinimumOrthoZoom({
        cameraWidth: camera.right - camera.left,
        cameraHeight: camera.top - camera.bottom,
        bounds,
      });
      controls.minZoom = Math.max(controls.minZoom, minimumZoom);
      if (camera.zoom < controls.minZoom) {
        camera.zoom = controls.minZoom;
        camera.updateProjectionMatrix();
      }
      root.dataset.pocInteractionMinZoom = controls.minZoom.toFixed(3);
      root.removeAttribute("data-poc-interaction-max-distance");
    } else if (camera instanceof THREE.PerspectiveCamera) {
      const width = bounds.maxX - bounds.minX;
      const height = bounds.maxZ - bounds.minZ;
      const currentDistance = camera.position.distanceTo(controls.target);
      controls.maxDistance = Math.max(
        currentDistance * 1.02,
        Math.min(controls.maxDistance, Math.hypot(width, height) * 0.72),
      );
      root.dataset.pocInteractionMaxDistance = controls.maxDistance.toFixed(1);
      root.removeAttribute("data-poc-interaction-min-zoom");
    }
    root.dataset.pocInteractionBounds = `${Math.round(
      bounds.maxX - bounds.minX,
    )}x${Math.round(bounds.maxZ - bounds.minZ)}`;

    let applying = false;
    const clampCamera = () => {
      if (applying) return;
      const footprint = resolveGroundFootprint(camera, controls.target);
      if (!footprint) return;
      const next = clampThreeOsmCameraTarget({
        target: controls.target,
        bounds,
        footprint,
      });
      if (!next.clamped) return;
      applying = true;
      const delta = new THREE.Vector3(
        next.x - controls.target.x,
        0,
        next.z - controls.target.z,
      );
      controls.target.add(delta);
      camera.position.add(delta);
      controls.update();
      applying = false;
      root.dataset.pocInteractionClamps = String(
        Number(root.dataset.pocInteractionClamps || 0) + 1,
      );
      requestRenderRef.current();
    };
    controls.addEventListener("change", clampCamera);
    clampCamera();
    return () => controls.removeEventListener("change", clampCamera);
  }, [
    activeCameraRef,
    controlsRef,
    requestRenderRef,
    rootRef,
    tileCenter,
    viewMode,
    visibleTiles,
  ]);
}
