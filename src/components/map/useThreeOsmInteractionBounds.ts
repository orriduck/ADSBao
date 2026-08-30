import { useEffect, useRef, type MutableRefObject, type RefObject } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  clampThreeOsmCameraTarget,
  resolveThreeOsmMinimumOrthoZoom,
  resolveThreeOsmTileWorldBounds,
  resolveThreeOsmVisibleHorizontalFraction,
} from "@/features/airport/map/threeOsmInteractionBounds";
import { resolveThreeOsmCameraGroundFootprint } from "@/features/airport/map/threeOsmCameraGroundFootprint";
import type { TileCoordinate } from "@/features/airport/map/threeOsmProjection";
import type { ThreeOsmCameraViewportOffsets } from "@/features/airport/map/threeOsmCameraFit";
import {
  buildThreeOsmTileWindowGrid,
  createThreeOsmSquareTileWindow,
} from "@/features/airport/map/threeOsmTileWindow";
import { getFloatingSidebarOcclusionWidth } from "./mapViewportOffset";

export function useThreeOsmInteractionBounds({
  rootRef,
  activeCameraRef,
  controlsRef,
  requestRenderRef,
  cameraViewportOffsetRef,
  lifecycleKey,
  tileCenter,
  viewMode,
}: {
  rootRef: RefObject<HTMLElement | null>;
  activeCameraRef: MutableRefObject<THREE.Camera | null>;
  controlsRef: MutableRefObject<OrbitControls | null>;
  requestRenderRef: MutableRefObject<() => void>;
  cameraViewportOffsetRef: MutableRefObject<ThreeOsmCameraViewportOffsets>;
  lifecycleKey: string;
  tileCenter: TileCoordinate;
  viewMode: "2d" | "3d";
}) {
  const minimumZoomFloorByCameraRef = useRef(
    new WeakMap<THREE.Camera, number>(),
  );

  useEffect(() => {
    const root = rootRef.current;
    const camera = activeCameraRef.current;
    const controls = controlsRef.current;
    const bounds = resolveThreeOsmTileWorldBounds({
      tiles: buildThreeOsmTileWindowGrid({
        center: tileCenter,
        window: createThreeOsmSquareTileWindow(3),
      }),
      center: tileCenter,
    });
    if (!root || !camera || !controls || !bounds) return;
    const occlusionWidth = getFloatingSidebarOcclusionWidth(root);
    const visibleHorizontalFraction = resolveThreeOsmVisibleHorizontalFraction({
      viewportWidth: root.clientWidth,
      occlusionWidth,
    });
    const visibleLeftNdc = 1 - 2 * visibleHorizontalFraction;

    if (camera instanceof THREE.OrthographicCamera) {
      if (!minimumZoomFloorByCameraRef.current.has(camera)) {
        minimumZoomFloorByCameraRef.current.set(camera, controls.minZoom);
      }
      const minimumZoom = resolveThreeOsmMinimumOrthoZoom({
        cameraWidth:
          (camera.right - camera.left) * visibleHorizontalFraction,
        cameraHeight: camera.top - camera.bottom,
        bounds,
      });
      controls.minZoom = Math.max(
        minimumZoomFloorByCameraRef.current.get(camera) || 0.4,
        minimumZoom,
      );
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
    root.dataset.pocInteractionVisibleFraction =
      visibleHorizontalFraction.toFixed(3);

    let applying = false;
    const clampCamera = (adjustViewportOffset = false) => {
      if (applying) return;
      const footprint = resolveThreeOsmCameraGroundFootprint({
        camera,
        target: controls.target,
        visibleLeftNdc,
      });
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
      if (adjustViewportOffset) {
        const offset = cameraViewportOffsetRef.current[viewMode];
        offset.x += delta.x;
        offset.z += delta.z;
        root.dataset.pocCameraViewportOffset = `${offset.x.toFixed(2)},${offset.z.toFixed(2)}`;
      }
      controls.update();
      applying = false;
      root.dataset.pocInteractionClamps = String(
        Number(root.dataset.pocInteractionClamps || 0) + 1,
      );
      requestRenderRef.current();
    };
    const clampChangedCamera = () => clampCamera(false);
    controls.addEventListener("change", clampChangedCamera);
    clampCamera(true);
    return () => controls.removeEventListener("change", clampChangedCamera);
  }, [
    activeCameraRef,
    cameraViewportOffsetRef,
    controlsRef,
    lifecycleKey,
    requestRenderRef,
    rootRef,
    tileCenter,
    viewMode,
  ]);
}
