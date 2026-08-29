import * as THREE from "three";

export type ThreeOsmAircraftEmphasis = "standard" | "selected" | "focal";

export const THREE_OSM_AIRCRAFT_SCREEN_SCALE = 1.42;

export function resolveThreeOsmAircraftEmphasis({
  id,
  selectedAircraftId,
  focalAircraftId,
}: {
  id: string;
  selectedAircraftId: string;
  focalAircraftId: string;
}): ThreeOsmAircraftEmphasis {
  if (id && id === focalAircraftId) return "focal";
  if (id && id === selectedAircraftId) return "selected";
  return "standard";
}

export function resolveThreeOsmAircraftScale(
  emphasis: ThreeOsmAircraftEmphasis,
) {
  if (emphasis === "focal") return 1.18;
  if (emphasis === "selected") return 1.12;
  return 1;
}

/**
 * A low-poly, top-down transport-aircraft silhouette. The geometry stays flat
 * in the geographic X/Z plane so every target can still share one instanced
 * mesh in both orthographic and perspective modes.
 */
export function createThreeOsmAircraftGeometry() {
  const boundary: Array<[number, number]> = [
    [0, -8.2],
    [-0.85, -4.2],
    [-5.4, -0.8],
    [-5.1, 0.55],
    [-1.25, -0.55],
    [-1.05, 3.25],
    [-2.55, 4.65],
    [-2.25, 5.55],
    [0, 4.75],
    [2.25, 5.55],
    [2.55, 4.65],
    [1.05, 3.25],
    [1.25, -0.55],
    [5.1, 0.55],
    [5.4, -0.8],
    [0.85, -4.2],
  ];
  const positions = [0, 0, 0];
  boundary.forEach(([x, z]) => positions.push(x, 0, z));
  const indices: number[] = [];
  boundary.forEach((_, index) => {
    indices.push(0, index + 1, ((index + 1) % boundary.length) + 1);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export function createThreeOsmAircraftSelectionGeometry() {
  const geometry = new THREE.RingGeometry(8.7, 9.7, 32);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}
