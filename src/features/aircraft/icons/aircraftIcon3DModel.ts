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
        ambientIntensity: 0.42,
        keyLightIntensity: 0.62,
        rimLightIntensity: 1.35,
        navLightsVisible: true,
        navLightIntensity: 1.18,
        shadowOpacity: 0.42,
      };
    case "dusk":
    case "sunset":
      return {
        ambientIntensity: 0.56,
        keyLightIntensity: 0.92,
        rimLightIntensity: 1.08,
        navLightsVisible: true,
        navLightIntensity: 0.72,
        shadowOpacity: 0.34,
      };
    case "morning":
    case "afternoon":
      return {
        ambientIntensity: 0.64,
        keyLightIntensity: 1.18,
        rimLightIntensity: 0.72,
        navLightsVisible: true,
        navLightIntensity: 0.36,
        shadowOpacity: 0.26,
      };
    default:
      return {
        ambientIntensity: 0.7,
        keyLightIntensity: 1.26,
        rimLightIntensity: 0.58,
        navLightsVisible: true,
        navLightIntensity: 0.32,
        shadowOpacity: 0.22,
      };
  }
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
        bodyGlowColor: "#9ccfff",
        bodyGlowOpacity: selected ? 0.08 : 0.045,
        color: selected ? "#c7d9ea" : "#9fb3c8",
        edgeColor: "#d9ecff",
        edgeOpacity: selected ? 0.54 : 0.34,
        emissive: "#142034",
        emissiveIntensity: selected ? 0.18 : 0.14,
        lightGlowScale: 5.2,
        lightRadius: 0.58,
        metalness: 0.22,
        roughness: 0.54,
      };
    case "dusk":
      return {
        bodyGlowColor: "#b9b1ff",
        bodyGlowOpacity: selected ? 0.07 : 0.035,
        color: selected ? "#a996aa" : "#837590",
        edgeColor: "#cbc2df",
        edgeOpacity: selected ? 0.48 : 0.26,
        emissive: "#1a1422",
        emissiveIntensity: 0.08 + selectedLift,
        lightGlowScale: 4.8,
        lightRadius: 0.52,
        metalness: 0.28,
        roughness: 0.5,
      };
    case "sunset":
      return {
        bodyGlowColor: "#ffc18f",
        bodyGlowOpacity: selected ? 0.07 : 0.04,
        color: selected ? "#d09872" : "#a87755",
        edgeColor: "#d9aa82",
        edgeOpacity: selected ? 0.5 : 0.3,
        emissive: "#21120a",
        emissiveIntensity: 0.07 + selectedLift,
        lightGlowScale: 4.4,
        lightRadius: 0.5,
        metalness: 0.3,
        roughness: 0.48,
      };
    case "morning":
      return {
        bodyGlowColor: "#ffe0a8",
        bodyGlowOpacity: selected ? 0.055 : 0.024,
        color: selected ? "#c0ad87" : "#9d8f72",
        edgeColor: "#73664f",
        edgeOpacity: selected ? 0.42 : 0.22,
        emissive: "#100b05",
        emissiveIntensity: 0.045 + selectedLift,
        lightGlowScale: 3.8,
        lightRadius: 0.42,
        metalness: 0.34,
        roughness: 0.44,
      };
    case "afternoon":
      return {
        bodyGlowColor: "#fff1c7",
        bodyGlowOpacity: selected ? 0.05 : 0.02,
        color: selected ? "#ada180" : "#8c846f",
        edgeColor: "#5c5240",
        edgeOpacity: selected ? 0.42 : 0.2,
        emissive: "#0c0905",
        emissiveIntensity: 0.04 + selectedLift,
        lightGlowScale: 3.6,
        lightRadius: 0.4,
        metalness: 0.34,
        roughness: 0.42,
      };
    default:
      return {
        bodyGlowColor: "#fff3cc",
        bodyGlowOpacity: selected ? 0.048 : 0.018,
        color: selected ? "#a99f83" : "#817a6c",
        edgeColor: "#554a3c",
        edgeOpacity: selected ? 0.4 : 0.18,
        emissive: "#080604",
        emissiveIntensity: 0.035 + selectedLift,
        lightGlowScale: 3.4,
        lightRadius: 0.38,
        metalness: 0.34,
        roughness: 0.42,
      };
  }
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
