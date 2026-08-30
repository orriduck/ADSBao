import {
  useEffect,
  useState,
  type MutableRefObject,
  type RefObject,
} from "react";
import type * as THREE from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { resolveThreeOsmCameraGroundFootprint } from "@/features/airport/map/threeOsmCameraGroundFootprint";
import { resolveThreeOsmVisibleHorizontalFraction } from "@/features/airport/map/threeOsmInteractionBounds";
import type { ThreeOsmViewportFootprint } from "@/features/airport/map/threeOsmTileWindow";
import type { ThreeOsmCameraViewportOffsets } from "@/features/airport/map/threeOsmCameraFit";
import { getFloatingSidebarOcclusionWidth } from "./mapViewportOffset";

function initialFootprint(compact: boolean): ThreeOsmViewportFootprint {
  return compact
    ? { minX: -300, maxX: 300, minZ: -600, maxZ: 600 }
    : { minX: -600, maxX: 600, minZ: -480, maxZ: 480 };
}

function footprintKey(footprint: ThreeOsmViewportFootprint) {
  return [footprint.minX, footprint.maxX, footprint.minZ, footprint.maxZ]
    .map((value) => Math.round(value * 10) / 10)
    .join(":");
}

export function useThreeOsmViewportFootprint({
  rootRef,
  activeCameraRef,
  controlsRef,
  cameraViewportOffsetRef,
  compact,
  viewMode,
  lifecycleKey,
}: {
  rootRef: RefObject<HTMLElement | null>;
  activeCameraRef: MutableRefObject<THREE.Camera | null>;
  controlsRef: MutableRefObject<OrbitControls | null>;
  cameraViewportOffsetRef: MutableRefObject<ThreeOsmCameraViewportOffsets>;
  compact: boolean;
  viewMode: "2d" | "3d";
  lifecycleKey: string;
}) {
  const measurementKey = `${String(lifecycleKey)}:${viewMode}:${compact ? 1 : 0}`;
  const [measurement, setMeasurement] = useState<{
    key: string;
    footprint: ThreeOsmViewportFootprint;
  }>(() => ({ key: "", footprint: initialFootprint(compact) }));

  useEffect(() => {
    const root = rootRef.current;
    let frame = 0;
    let controls: OrbitControls | null = null;
    if (!root) return undefined;

    const update = () => {
      frame = 0;
      const camera = activeCameraRef.current;
      controls = controlsRef.current;
      if (!camera || !controls) return;
      const visibleFraction = resolveThreeOsmVisibleHorizontalFraction({
        viewportWidth: root.clientWidth,
        occlusionWidth: getFloatingSidebarOcclusionWidth(root),
      });
      const ground = resolveThreeOsmCameraGroundFootprint({
        camera,
        target: controls.target,
        visibleLeftNdc: 1 - 2 * visibleFraction,
      });
      if (!ground) return;
      const viewportOffset = cameraViewportOffsetRef.current[viewMode];
      const next = {
        minX: ground.minX + viewportOffset.x,
        maxX: ground.maxX + viewportOffset.x,
        minZ: ground.minZ + viewportOffset.z,
        maxZ: ground.maxZ + viewportOffset.z,
      };
      setMeasurement((current) =>
        current.key === measurementKey &&
        footprintKey(current.footprint) === footprintKey(next)
          ? current
          : { key: measurementKey, footprint: next },
      );
      root.dataset.pocViewportFootprint = `${Math.round(
        next.maxX - next.minX,
      )}x${Math.round(next.maxZ - next.minZ)}`;
    };
    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(update);
    };
    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(root);
    frame = window.requestAnimationFrame(update);
    const attachFrame = window.requestAnimationFrame(() => {
      controls = controlsRef.current;
      controls?.addEventListener("end", scheduleUpdate);
      scheduleUpdate();
    });
    return () => {
      resizeObserver.disconnect();
      controls?.removeEventListener("end", scheduleUpdate);
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(attachFrame);
    };
  }, [
    activeCameraRef,
    cameraViewportOffsetRef,
    controlsRef,
    measurementKey,
    rootRef,
    viewMode,
  ]);

  return {
    footprint: measurement.footprint,
    ready: measurement.key === measurementKey,
  };
}
