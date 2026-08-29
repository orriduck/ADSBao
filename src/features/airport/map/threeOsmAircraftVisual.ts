import * as THREE from "three";

export type ThreeOsmAircraftEmphasis = "standard" | "selected" | "focal";
export type ThreeOsmAircraftFamily =
  | "transport"
  | "heavy"
  | "light"
  | "rotorcraft"
  | "high-performance";

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

function normalizeAircraftCode(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

export function resolveThreeOsmAircraftFamily(
  aircraft: Record<string, unknown> = {},
): ThreeOsmAircraftFamily {
  const category = normalizeAircraftCode(aircraft.category);
  const type = normalizeAircraftCode(
    aircraft.type || aircraft.icaoType || aircraft.t,
  );

  if (
    category === "A7" ||
    /^(?:H47|H60|H64|R44|EC20|EC35|EC45|S61|UH1|NH90|MI24|LYNX|GAZL|V22)$/.test(
      type,
    )
  ) {
    return "rotorcraft";
  }
  if (
    category === "A6" ||
    /^(?:A10|B1|B52|F1[4568]|F2[235]|F35|EUFI|T38|U2|MIRA|RFAL|VF35)$/.test(
      type,
    )
  ) {
    return "high-performance";
  }
  if (
    category === "A5" ||
    /^(?:A3[3458]|B74|B76|B77|B78|DC10|MD11|IL96|A124|A225)/.test(type)
  ) {
    return "heavy";
  }
  if (
    category === "A1" ||
    category === "A2" ||
    /^(?:C1(?:50|52|62|72)|C20[568]|P28|PA46|SR2[02]|DA42|PC12|P180|B350|B190)/.test(
      type,
    )
  ) {
    return "light";
  }
  return "transport";
}

const AIRCRAFT_FAMILY_BOUNDARIES: Record<
  ThreeOsmAircraftFamily,
  Array<[number, number]>
> = {
  transport: [
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
  ],
  heavy: [
    [0, -8.5],
    [-1.15, -4.7],
    [-6.4, -0.65],
    [-6.15, 0.9],
    [-1.55, -0.25],
    [-1.35, 3.5],
    [-3.1, 4.85],
    [-2.75, 5.9],
    [0, 5.1],
    [2.75, 5.9],
    [3.1, 4.85],
    [1.35, 3.5],
    [1.55, -0.25],
    [6.15, 0.9],
    [6.4, -0.65],
    [1.15, -4.7],
  ],
  light: [
    [0, -7.2],
    [-0.65, -2.7],
    [-5.6, -0.35],
    [-5.55, 0.65],
    [-0.9, 0.1],
    [-0.75, 3.65],
    [-2.2, 4.35],
    [-1.8, 5.15],
    [0, 4.65],
    [1.8, 5.15],
    [2.2, 4.35],
    [0.75, 3.65],
    [0.9, 0.1],
    [5.55, 0.65],
    [5.6, -0.35],
    [0.65, -2.7],
  ],
  rotorcraft: [
    [0, -6.8],
    [-0.7, -2.1],
    [-6.4, -0.55],
    [-6.4, 0.55],
    [-1.25, 1.35],
    [-1.1, 3.65],
    [-2.2, 4.35],
    [0, 3.95],
    [2.2, 4.35],
    [1.1, 3.65],
    [1.25, 1.35],
    [6.4, 0.55],
    [6.4, -0.55],
    [0.7, -2.1],
  ],
  "high-performance": [
    [0, -9],
    [-0.7, -4.6],
    [-5.8, 1.7],
    [-5.25, 2.8],
    [-1.35, 1.45],
    [-1.05, 4.35],
    [-2.1, 5.25],
    [0, 4.75],
    [2.1, 5.25],
    [1.05, 4.35],
    [1.35, 1.45],
    [5.25, 2.8],
    [5.8, 1.7],
    [0.7, -4.6],
  ],
};

/**
 * Low-poly, top-down silhouettes grouped into five bounded operational
 * families. Geometry stays flat in the geographic X/Z plane so every family
 * can use one instanced mesh in both orthographic and perspective modes.
 */
export function createThreeOsmAircraftGeometry(
  family: ThreeOsmAircraftFamily = "transport",
) {
  const boundary = AIRCRAFT_FAMILY_BOUNDARIES[family];
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
