type Aircraft3DOverlayOptions = {
  immersiveModeActive?: boolean;
};

type AircraftContrailOptions = Aircraft3DOverlayOptions & {
  altitude?: unknown;
  velocity?: unknown;
};

type Aircraft3DLightingOptions = {
  phase?: unknown;
};

type Aircraft3DModelScaleOptions = {
  altitude?: unknown;
  family?: unknown;
  selected?: boolean;
  sizeScale?: unknown;
};

type Aircraft3DMaterialOptions = {
  phase?: unknown;
  selected?: boolean;
};

type Aircraft3DLandingLightOptions = Aircraft3DMaterialOptions & {
  altitude?: unknown;
  onGround?: boolean;
};

type Aircraft3DEdgeToneOptions = Aircraft3DMaterialOptions & {
  lightDot?: unknown;
};

type Aircraft3DAttitudeOptions = {
  phase?: unknown;
  pitch?: unknown;
  roll?: unknown;
  selected?: boolean;
};

const CONTRAIL_MIN_ALTITUDE_FT = 32_000;
const CONTRAIL_MIN_SPEED_KT = 240;
const AIRCRAFT_ORIGINAL_ICON_SIZE_PX = 18;
const FAMILY_VISUAL_SCALE: Record<string, number> = {
  balloon: 0.92,
  jet: 1,
  propeller: 0.86,
  rotorcraft: 0.84,
  unknown: 0.92,
};

const toFiniteNumber = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const round2 = (value: number) => Math.round(value * 100) / 100;

const hexToRgb = (hex: string) => {
  const normalized = hex.replace("#", "");
  return [0, 2, 4].map((start) =>
    Number.parseInt(normalized.slice(start, start + 2), 16),
  ) as [number, number, number];
};

const rgbToHex = ([r, g, b]: [number, number, number]) =>
  `#${[r, g, b]
    .map((channel) =>
      clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0"),
    )
    .join("")}`;

const mixHex = (from: string, to: string, amount: number) => {
  const ratio = clamp(amount, 0, 1);
  const fromRgb = hexToRgb(from);
  const toRgb = hexToRgb(to);
  return rgbToHex(
    fromRgb.map((channel, index) =>
      channel + (toRgb[index] - channel) * ratio,
    ) as [number, number, number],
  );
};

export const shouldRenderAircraft3DOverlay = ({
  immersiveModeActive = false,
}: Aircraft3DOverlayOptions = {}) => Boolean(immersiveModeActive);

export const shouldRenderAircraftContrail = ({
  immersiveModeActive = false,
  altitude = null,
  velocity = null,
}: AircraftContrailOptions = {}) => {
  if (!immersiveModeActive) return false;
  const altitudeFt = toFiniteNumber(altitude);
  const velocityKt = toFiniteNumber(velocity);
  return Boolean(
    altitudeFt != null &&
      velocityKt != null &&
      altitudeFt >= CONTRAIL_MIN_ALTITUDE_FT &&
      velocityKt >= CONTRAIL_MIN_SPEED_KT,
  );
};

export const resolveAircraft3DLightingProfile = ({
  phase = "day",
}: Aircraft3DLightingOptions = {}) => {
  switch (phase) {
    case "night":
      return {
        ambientColor: "#b8d5ff",
        ambientIntensity: 0.3,
        keyLightColor: "#c9ddff",
        keyLightIntensity: 0.42,
        landingLightIntensity: 1.15,
        landingLightsVisible: true,
        navLightsVisible: true,
        navLightIntensity: 1.48,
        rimLightColor: "#76b8ff",
        rimLightIntensity: 0.78,
        shadowOpacity: 0.1,
      };
    case "dusk":
    case "sunset":
      return {
        ambientColor: "#ffe0c2",
        ambientIntensity: 0.68,
        keyLightColor: "#ffd8a8",
        keyLightIntensity: 1.04,
        landingLightIntensity: 0.48,
        landingLightsVisible: true,
        navLightsVisible: true,
        navLightIntensity: 0.78,
        rimLightColor: "#c9d0ff",
        rimLightIntensity: 0.92,
        shadowOpacity: 0.12,
      };
    case "morning":
    case "afternoon":
      return {
        ambientColor: "#f4f0df",
        ambientIntensity: 0.82,
        keyLightColor: "#fff0c8",
        keyLightIntensity: 1.28,
        landingLightIntensity: 0.16,
        landingLightsVisible: false,
        navLightsVisible: true,
        navLightIntensity: 0.36,
        rimLightColor: "#d5e3ff",
        rimLightIntensity: 0.54,
        shadowOpacity: 0.075,
      };
    default:
      return {
        ambientColor: "#f3efe4",
        ambientIntensity: 0.86,
        keyLightColor: "#fff2cc",
        keyLightIntensity: 1.34,
        landingLightIntensity: 0.12,
        landingLightsVisible: false,
        navLightsVisible: true,
        navLightIntensity: 0.32,
        rimLightColor: "#d6e5ff",
        rimLightIntensity: 0.46,
        shadowOpacity: 0.07,
      };
  }
};

export const resolveAircraft3DLandingLightIntensity = ({
  altitude = null,
  onGround = false,
  phase = "day",
  selected = false,
}: Aircraft3DLandingLightOptions = {}) => {
  const phaseKey = String(phase || "day");
  const altitudeFt = toFiniteNumber(altitude);
  if (phaseKey !== "night") return selected ? 0.36 : 1;
  if (onGround) return 1;
  if (altitudeFt == null) return selected ? 0.18 : 0.42;

  const approachRatio = clamp((18_000 - altitudeFt) / 15_000, 0, 1);
  const approachIntensity = Math.pow(approachRatio, 1.34);
  const selectedFloor = selected ? 0.08 : 0.03;
  return round2(Math.max(selectedFloor, approachIntensity));
};

export const resolveAircraft3DModelScalePx = ({
  family = "jet",
  sizeScale = 1,
}: Aircraft3DModelScaleOptions = {}) => {
  const wakeScale = clamp(toFiniteNumber(sizeScale) ?? 1, 0.7, 1.24);
  const smallAircraftScale =
    wakeScale < 1 ? 1 - (1 - wakeScale) * 1.85 : wakeScale;
  const familyKey = typeof family === "string" ? family : "unknown";
  const familyScale = FAMILY_VISUAL_SCALE[familyKey] ?? FAMILY_VISUAL_SCALE.unknown;
  return round2(
    AIRCRAFT_ORIGINAL_ICON_SIZE_PX *
      clamp(smallAircraftScale, 0.72, 1.1) *
      familyScale,
  );
};

export const resolveAircraft3DMaterialProfile = ({
  phase = "day",
  selected = false,
}: Aircraft3DMaterialOptions = {}) => {
  const selectedLift = selected ? 0.04 : 0;
  switch (phase) {
    case "night":
      return {
        bodyGlowColor: "#9bcfff",
        bodyGlowOpacity: selected ? 0.096 : 0.06,
        color: selected ? "#eff9ff" : "#cbd7e2",
        edgeColor: "#cbe4ff",
        edgeContrast: 0.86,
        edgeHighlightColor: "#f8fdff",
        edgeLightVector: { x: -0.34, y: -0.72, z: 0.6 },
        edgeOpacity: selected ? 0.1 : 0.055,
        edgeShadowColor: "#26364a",
        emissive: "#0b1422",
        emissiveIntensity: selected ? 0.23 : 0.18,
        landingLightColor: "#fff1cc",
        landingLightOpacity: 1,
        landingLightScale: 5.5,
        lightGlowScale: 12.8,
        lightRadius: 1.32,
        metalness: 0.22,
        roughness: 0.54,
      };
    case "dusk":
      return {
        bodyGlowColor: "#d7d3ff",
        bodyGlowOpacity: selected ? 0.06 : 0.03,
        color: selected ? "#fffdf8" : "#fbf8f4",
        edgeColor: "#bcb7ad",
        edgeContrast: 0.62,
        edgeHighlightColor: "#fffaf0",
        edgeLightVector: { x: -0.58, y: -0.44, z: 0.68 },
        edgeOpacity: selected ? 0.11 : 0.075,
        edgeShadowColor: "#8b8278",
        emissive: "#fff3df",
        emissiveIntensity: 0.16 + selectedLift,
        landingLightColor: "#fff0d1",
        landingLightOpacity: selected ? 0.54 : 0.38,
        landingLightScale: 1.9,
        lightGlowScale: 4.7,
        lightRadius: 0.52,
        metalness: 0.02,
        roughness: 0.36,
      };
    case "sunset":
      return {
        bodyGlowColor: "#ffd1a7",
        bodyGlowOpacity: selected ? 0.062 : 0.032,
        color: selected ? "#fffaf0" : "#fbf1e2",
        edgeColor: "#b79b7c",
        edgeContrast: 0.68,
        edgeHighlightColor: "#fff1cf",
        edgeLightVector: { x: -0.72, y: -0.28, z: 0.58 },
        edgeOpacity: selected ? 0.12 : 0.08,
        edgeShadowColor: "#8e7059",
        emissive: "#ffe0b3",
        emissiveIntensity: 0.15 + selectedLift,
        landingLightColor: "#fff0c6",
        landingLightOpacity: selected ? 0.52 : 0.36,
        landingLightScale: 1.8,
        lightGlowScale: 4.2,
        lightRadius: 0.5,
        metalness: 0.02,
        roughness: 0.34,
      };
    case "morning":
      return {
        bodyGlowColor: "#ffe4b6",
        bodyGlowOpacity: selected ? 0.042 : 0.018,
        color: selected ? "#fffdf6" : "#fbf7ed",
        edgeColor: "#a99d88",
        edgeContrast: 0.54,
        edgeHighlightColor: "#fffdf3",
        edgeLightVector: { x: -0.52, y: -0.62, z: 0.58 },
        edgeOpacity: selected ? 0.105 : 0.065,
        edgeShadowColor: "#9a8d78",
        emissive: "#fff0d0",
        emissiveIntensity: 0.14 + selectedLift,
        landingLightColor: "#fff1cd",
        landingLightOpacity: selected ? 0.2 : 0.14,
        landingLightScale: 1.25,
        lightGlowScale: 3.6,
        lightRadius: 0.42,
        metalness: 0.015,
        roughness: 0.32,
      };
    case "afternoon":
      return {
        bodyGlowColor: "#fff1c7",
        bodyGlowOpacity: selected ? 0.038 : 0.014,
        color: selected ? "#fffdf8" : "#fbf8f1",
        edgeColor: "#9a9283",
        edgeContrast: 0.48,
        edgeHighlightColor: "#fffdf5",
        edgeLightVector: { x: -0.36, y: -0.74, z: 0.56 },
        edgeOpacity: selected ? 0.1 : 0.06,
        edgeShadowColor: "#918978",
        emissive: "#fff2d8",
        emissiveIntensity: 0.135 + selectedLift,
        landingLightColor: "#fff2d0",
        landingLightOpacity: selected ? 0.18 : 0.12,
        landingLightScale: 1.15,
        lightGlowScale: 3.4,
        lightRadius: 0.4,
        metalness: 0.015,
        roughness: 0.32,
      };
    default:
      return {
        bodyGlowColor: "#fff3cc",
        bodyGlowOpacity: selected ? 0.036 : 0.012,
        color: selected ? "#fffdfa" : "#fcf8f1",
        edgeColor: "#9a9182",
        edgeContrast: 0.48,
        edgeHighlightColor: "#fffdf6",
        edgeLightVector: { x: -0.42, y: -0.7, z: 0.58 },
        edgeOpacity: selected ? 0.095 : 0.058,
        edgeShadowColor: "#8d8576",
        emissive: "#fff4df",
        emissiveIntensity: 0.13 + selectedLift,
        landingLightColor: "#fff3d6",
        landingLightOpacity: selected ? 0.16 : 0.1,
        landingLightScale: 1.1,
        lightGlowScale: 3.2,
        lightRadius: 0.38,
        metalness: 0.01,
        roughness: 0.32,
      };
  }
};

export const resolveAircraft3DEdgeTone = ({
  phase = "day",
  selected = false,
  lightDot = 0,
}: Aircraft3DEdgeToneOptions = {}) => {
  const profile = resolveAircraft3DMaterialProfile({ phase, selected });
  const dot = clamp(toFiniteNumber(lightDot) ?? 0, -1, 1);
  const litRatio = clamp((dot + 1) / 2, 0, 1);
  const opacity = round2(
    clamp(
      profile.edgeOpacity * (0.52 + litRatio * (0.82 + profile.edgeContrast * 0.42)),
      phase === "night" ? 0.018 : 0.02,
      phase === "night" ? 0.16 : selected ? 0.2 : 0.14,
    ),
  );

  return {
    color: mixHex(
      profile.edgeShadowColor,
      profile.edgeHighlightColor,
      litRatio,
    ),
    opacity,
  };
};

export const resolveAircraft3DAttitudeRotation = ({
  phase = "day",
  pitch = 0,
  roll = 0,
}: Aircraft3DAttitudeOptions = {}) => {
  const baseRotationXDeg = phase === "night" ? 22 : 26;
  const baseRotationYDeg = phase === "night" ? -5 : -7;
  const rollDeg = clamp(toFiniteNumber(roll) ?? 0, -35, 35);
  const pitchDeg = clamp(toFiniteNumber(pitch) ?? 0, -12, 12);
  return {
    rotationXDeg: round2(baseRotationXDeg - pitchDeg * 0.48),
    rotationYDeg: round2(baseRotationYDeg + rollDeg * 0.46),
  };
};
