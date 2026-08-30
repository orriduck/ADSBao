import { useEffect, useRef, type MutableRefObject, type RefObject } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { ThreeOsmActiveCameraFit } from "./useThreeOsmCameraFitState";
import {
  resolveThreeOsmCameraFrame,
  resolveThreeOsmDefaultCameraFrame,
  type ThreeOsmCameraViewportOffsets,
} from "@/features/airport/map/threeOsmCameraFit";
import { getFloatingSidebarOcclusionWidth } from "./mapViewportOffset";
import {
  lonLatAltitudeToThreeOsmWorld,
  type TileCoordinate,
} from "@/features/airport/map/threeOsmProjection";

export function useThreeOsmCameraFraming({
  rootRef,
  activeCameraRef,
  controlsRef,
  requestRenderRef,
  activeCameraFit,
  tileCenter,
  sceneCenterLat,
  viewMode,
  keepRouteInView,
  tileRadius,
  cameraViewportOffsetRef,
  restoredCameraModeRef,
}: {
  rootRef: RefObject<HTMLElement | null>;
  activeCameraRef: MutableRefObject<THREE.Camera | null>;
  controlsRef: MutableRefObject<OrbitControls | null>;
  requestRenderRef: MutableRefObject<() => void>;
  activeCameraFit: ThreeOsmActiveCameraFit | null;
  tileCenter: TileCoordinate;
  sceneCenterLat: number;
  viewMode: "2d" | "3d";
  keepRouteInView: boolean;
  tileRadius: number;
  cameraViewportOffsetRef: MutableRefObject<ThreeOsmCameraViewportOffsets>;
  restoredCameraModeRef: MutableRefObject<"2d" | "3d" | null>;
}) {
  const applyCameraFitRef = useRef<() => void>(() => {});

  useEffect(() => {
    const root = rootRef.current;
    const camera = activeCameraRef.current;
    const controls = controlsRef.current;
    if (!root || !camera || !controls) return;

    const resetCamera = () => {
      const frame = resolveThreeOsmDefaultCameraFrame({
        mode: viewMode,
        width: root.clientWidth,
        height: root.clientHeight,
        occlusionWidth: getFloatingSidebarOcclusionWidth(root),
        tileRadius,
      });
      controls.target.set(frame.target.x, frame.target.y, frame.target.z);
      cameraViewportOffsetRef.current[viewMode] = {
        x: frame.target.x,
        z: frame.target.z,
      };
      controls.minDistance = 180;
      controls.maxDistance = 1_600;
      controls.minZoom = 0.5;
      controls.maxZoom = 4;
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.position.set(frame.position.x, frame.position.y, frame.position.z);
        camera.up.set(frame.up.x, frame.up.y, frame.up.z);
        camera.near = 1;
        camera.far = 6_000;
        camera.lookAt(frame.target.x, frame.target.y, frame.target.z);
        camera.updateProjectionMatrix();
        controls.minDistance = Math.max(100, Number(frame.distance) * 0.2);
        controls.maxDistance = Math.max(1_600, Number(frame.distance) * 2.5);
        root.dataset.pocDefaultPerspectiveDistance = Number(
          frame.distance,
        ).toFixed(1);
        root.dataset.pocDefaultPerspectiveElevation = String(
          frame.elevationDegrees,
        );
      } else if (camera instanceof THREE.OrthographicCamera) {
        camera.position.set(frame.position.x, frame.position.y, frame.position.z);
        camera.up.set(frame.up.x, frame.up.y, frame.up.z);
        camera.zoom = Number(frame.orthographicZoom);
        camera.lookAt(frame.target.x, frame.target.y, frame.target.z);
        camera.updateProjectionMatrix();
        root.removeAttribute("data-poc-default-perspective-distance");
        root.removeAttribute("data-poc-default-perspective-elevation");
      }
      controls.update();
      root.dataset.pocViewportOcclusionWidth = frame.occlusionWidth.toFixed(1);
      root.dataset.pocDefaultVisibleAspect = frame.visibleAspect.toFixed(3);
      root.dataset.pocCameraViewportOffset = `${frame.target.x.toFixed(2)},${frame.target.z.toFixed(2)}`;
      root.dataset.pocFitCamera = "default";
      root.removeAttribute("data-poc-fit-distance");
      root.removeAttribute("data-poc-fit-ortho-zoom");
      requestRenderRef.current();
    };

    if (!activeCameraFit) {
      applyCameraFitRef.current = resetCamera;
      if (restoredCameraModeRef.current === viewMode) {
        root.dataset.pocFitCamera = `${viewMode}-restored`;
        requestRenderRef.current();
        return () => {
          if (applyCameraFitRef.current === resetCamera) {
            applyCameraFitRef.current = () => {};
          }
        };
      }
      resetCamera();
      return () => {
        if (applyCameraFitRef.current === resetCamera) {
          applyCameraFitRef.current = () => {};
        }
      };
    }

    const projectFitPoints = () => {
      const groundPoints = activeCameraFit.fitPoints.flatMap(([lat, lon]) => {
        const point = lonLatAltitudeToThreeOsmWorld({
          lat,
          lon,
          altitudeFt: 0,
          center: tileCenter,
          centerLat: sceneCenterLat,
        });
        return point ? [point] : [];
      });
      const altitudePoints = activeCameraFit.altitudeSamples.flatMap((sample) => {
        const point = lonLatAltitudeToThreeOsmWorld({
          lat: sample?.lat,
          lon: sample?.lon,
          altitudeFt: sample?.onGround ? 0 : sample?.altitude,
          center: tileCenter,
          centerLat: sceneCenterLat,
        });
        return point ? [point] : [];
      });
      return [...groundPoints, ...altitudePoints];
    };
    const applyFit = () => {
      const frame = resolveThreeOsmCameraFrame({
        points: projectFitPoints(),
        mode: viewMode,
        aspect: root.clientWidth / Math.max(1, root.clientHeight),
      });
      if (!frame) return;
      controls.target.set(frame.target.x, frame.target.y, frame.target.z);
      cameraViewportOffsetRef.current[viewMode] = { x: 0, z: 0 };
      camera.position.set(frame.position.x, frame.position.y, frame.position.z);
      if (camera instanceof THREE.OrthographicCamera) {
        camera.zoom = frame.orthographicZoom;
        camera.updateProjectionMatrix();
        controls.minZoom = Math.max(0.1, frame.orthographicZoom * 0.35);
        controls.maxZoom = Math.max(4, frame.orthographicZoom * 4);
        root.dataset.pocFitOrthoZoom = frame.orthographicZoom.toFixed(3);
        root.removeAttribute("data-poc-fit-distance");
      } else if (camera instanceof THREE.PerspectiveCamera) {
        if (frame.up) camera.up.set(frame.up.x, frame.up.y, frame.up.z);
        camera.near = Math.max(0.5, frame.distance / 2_000);
        camera.far = Math.max(6_000, frame.distance * 5);
        camera.updateProjectionMatrix();
        controls.minDistance = Math.max(80, frame.distance * 0.18);
        controls.maxDistance = Math.max(1_600, frame.distance * 3.5);
        root.dataset.pocFitDistance = frame.distance.toFixed(1);
        root.removeAttribute("data-poc-fit-ortho-zoom");
      }
      camera.lookAt(frame.target.x, frame.target.y, frame.target.z);
      controls.update();
      root.dataset.pocFitCamera = viewMode;
      root.removeAttribute("data-poc-default-perspective-distance");
      root.removeAttribute("data-poc-default-perspective-elevation");
      requestRenderRef.current();
    };
    applyCameraFitRef.current = applyFit;
    applyFit();
    return () => {
      if (applyCameraFitRef.current === applyFit) {
        applyCameraFitRef.current = () => {};
      }
    };
  }, [
    activeCameraFit,
    activeCameraRef,
    cameraViewportOffsetRef,
    controlsRef,
    requestRenderRef,
    rootRef,
    restoredCameraModeRef,
    sceneCenterLat,
    tileCenter,
    tileRadius,
    viewMode,
  ]);

  useEffect(() => {
    const root = rootRef.current;
    const controls = controlsRef.current;
    if (
      !root ||
      !controls ||
      !keepRouteInView ||
      !activeCameraFit ||
      activeCameraFit.guardPoints.length < 2
    ) {
      return;
    }
    const handleEnd = () => {
      const camera = activeCameraRef.current;
      if (!camera) return;
      const endpointsVisible = activeCameraFit.guardPoints.every(([lat, lon]) => {
        const point = lonLatAltitudeToThreeOsmWorld({
          lat,
          lon,
          altitudeFt: 0,
          center: tileCenter,
          centerLat: sceneCenterLat,
        });
        if (!point) return false;
        const projected = new THREE.Vector3(point.x, point.y, point.z).project(camera);
        return (
          projected.z >= -1 &&
          projected.z <= 1 &&
          Math.abs(projected.x) <= 0.92 &&
          Math.abs(projected.y) <= 0.92
        );
      });
      if (endpointsVisible) return;
      root.dataset.pocFitGuardRestores = String(
        Number(root.dataset.pocFitGuardRestores || 0) + 1,
      );
      applyCameraFitRef.current();
    };
    controls.addEventListener("end", handleEnd);
    return () => controls.removeEventListener("end", handleEnd);
  }, [
    activeCameraFit,
    activeCameraRef,
    controlsRef,
    keepRouteInView,
    rootRef,
    sceneCenterLat,
    tileCenter,
    viewMode,
  ]);
}
