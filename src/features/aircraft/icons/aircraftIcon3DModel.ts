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

const CONTRAIL_MIN_ALTITUDE_FT = 32_000;
const CONTRAIL_MIN_SPEED_KT = 240;

const toFiniteNumber = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
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
