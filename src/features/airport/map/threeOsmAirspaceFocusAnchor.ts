import { THREE_OSM_TILE_SIZE } from "./threeOsmProjection";

export type ThreeOsmAirspaceFocusAnchor = {
  scopeKey: string;
  key: string;
  mode: "focal" | "camera";
  x: number;
  z: number;
};

const ENTER_CAMERA_RADIUS = THREE_OSM_TILE_SIZE * 0.55;
const RETURN_FOCAL_RADIUS = THREE_OSM_TILE_SIZE * 0.35;
const CAMERA_FOCUS_GRID = THREE_OSM_TILE_SIZE * 0.25;
const CAMERA_FOCUS_UPDATE_RADIUS = CAMERA_FOCUS_GRID * 0.75;

function focalAnchor(scopeKey: string): ThreeOsmAirspaceFocusAnchor {
  return {
    scopeKey,
    key: `${scopeKey}:focal`,
    mode: "focal",
    x: 0,
    z: 0,
  };
}

function cameraAnchor(
  scopeKey: string,
  targetX: number,
  targetZ: number,
): ThreeOsmAirspaceFocusAnchor {
  const x = Math.round(targetX / CAMERA_FOCUS_GRID) * CAMERA_FOCUS_GRID;
  const z = Math.round(targetZ / CAMERA_FOCUS_GRID) * CAMERA_FOCUS_GRID;
  return {
    scopeKey,
    key: `${scopeKey}:camera:${x.toFixed(0)},${z.toFixed(0)}`,
    mode: "camera",
    x,
    z,
  };
}

export function resolveThreeOsmAirspaceFocusAnchor({
  current = null,
  scopeKey,
  targetX,
  targetZ,
}: {
  current?: ThreeOsmAirspaceFocusAnchor | null;
  scopeKey: string;
  targetX: unknown;
  targetZ: unknown;
}): ThreeOsmAirspaceFocusAnchor {
  const safeScopeKey = String(scopeKey || "default");
  const x = Number.isFinite(Number(targetX)) ? Number(targetX) : 0;
  const z = Number.isFinite(Number(targetZ)) ? Number(targetZ) : 0;
  const distanceFromFocal = Math.hypot(x, z);
  const sameScope = current?.scopeKey === safeScopeKey;

  if (sameScope && current?.mode === "camera") {
    if (distanceFromFocal <= RETURN_FOCAL_RADIUS) {
      return focalAnchor(safeScopeKey);
    }
    if (
      Math.hypot(x - current.x, z - current.z) < CAMERA_FOCUS_UPDATE_RADIUS
    ) {
      return current;
    }
    return cameraAnchor(safeScopeKey, x, z);
  }

  if (distanceFromFocal <= ENTER_CAMERA_RADIUS) {
    return sameScope && current?.mode === "focal"
      ? current
      : focalAnchor(safeScopeKey);
  }
  return cameraAnchor(safeScopeKey, x, z);
}
