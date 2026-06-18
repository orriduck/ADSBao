/**
 * Aircraft exterior lighting model.
 *
 * Covers the standard lighting configuration for commercial and general
 * aviation aircraft as defined by FAA 14 CFR 91.205 / 91.209 and ICAO
 * Annex 6. Helicopters follow the same rules with the beacon typically
 * mounted on the engine cowling / rotor mast rather than the fuselage top.
 *
 * Aircraft orientation convention (matches the SVG icon set):
 *   Nose → top    (y ≈ 0)
 *   Tail → bottom (y ≈ 1)
 *   Left wing  → left  (x ≈ 0)
 *   Right wing → right (x ≈ 1)
 *
 * Flight phases are inferred from ADS-B state:
 *   onGround + speed=0 → PARKED
 *   onGround + speed>0 → TAXI
 *   airborne  + alt < 10000ft → APPROACH / DEPARTURE
 *   airborne  + alt >= 10000ft → CRUISE
 *
 * The model does NOT render — it only describes which lights are active and
 * where they sit on the icon. Rendering is the consumer's responsibility.
 */

// ---------------------------------------------------------------------------
// Light definitions
// ---------------------------------------------------------------------------

type LightColor = "red" | "green" | "white";

/** Blink pattern for pulsed anti-collision / strobe lights. */
type BlinkPattern =
  | "steady"     // always on — navigation / taxi / landing
  | "beacon"     // ~1 Hz, symmetric on/off (~500ms cycle) — red anti-collision
  | "strobe"     // ~2 Hz, short flash — white wingtip strobes
  ;

export interface AircraftLightDef {
  /** Unique key for this light type. */
  id: string;
  /** Human-readable label. */
  label: string;
  color: LightColor;
  /** Anchor key into AircraftIconAnchorRecord.anchors. */
  anchor: string;
  blink: BlinkPattern;
  /** CSS animation name hint for the renderer. */
  animationClass: string;
}

/** Catalogue of every exterior light a fixed-wing aircraft can carry. */
export const ALL_LIGHTS: Record<string, AircraftLightDef> = {
  navLeft: {
    id: "navLeft",
    label: "左航行灯",
    color: "red",
    anchor: "leftWingTip",
    blink: "steady",
    animationClass: "aircraft-light--nav",
  },
  navRight: {
    id: "navRight",
    label: "右航行灯",
    color: "green",
    anchor: "rightWingTip",
    blink: "steady",
    animationClass: "aircraft-light--nav",
  },
  navTail: {
    id: "navTail",
    label: "尾航行灯",
    color: "white",
    anchor: "tailLight",
    blink: "steady",
    animationClass: "aircraft-light--nav",
  },
  beaconTop: {
    id: "beaconTop",
    label: "顶部防撞灯",
    color: "red",
    anchor: "topBeacon",
    blink: "beacon",
    animationClass: "aircraft-light--beacon",
  },
  beaconBottom: {
    id: "beaconBottom",
    label: "底部防撞灯",
    color: "red",
    anchor: "bottomBeacon",
    blink: "beacon",
    animationClass: "aircraft-light--beacon",
  },
  strobeLeft: {
    id: "strobeLeft",
    label: "左频闪灯",
    color: "white",
    anchor: "leftWingTip",
    blink: "strobe",
    animationClass: "aircraft-light--strobe",
  },
  strobeRight: {
    id: "strobeRight",
    label: "右频闪灯",
    color: "white",
    anchor: "rightWingTip",
    blink: "strobe",
    animationClass: "aircraft-light--strobe",
  },
  landingLight: {
    id: "landingLight",
    label: "着陆灯",
    color: "white",
    anchor: "landingLight",
    blink: "steady",
    animationClass: "aircraft-light--landing",
  },
  taxiLight: {
    id: "taxiLight",
    label: "滑行灯",
    color: "white",
    anchor: "taxiLight",
    blink: "steady",
    animationClass: "aircraft-light--taxi",
  },
  logoLight: {
    id: "logoLight",
    label: "Logo灯",
    color: "white",
    anchor: "logoLight",
    blink: "steady",
    animationClass: "aircraft-light--logo",
  },
};

// ---------------------------------------------------------------------------
// Flight phases
// ---------------------------------------------------------------------------

/**
 * Flight phases that influence which lights are illuminated.
 *
 * Derived from ADS-B onGround + velocity + baro altitude. The transition
 * between APPROACH and DEPARTURE is ambiguous from a single snapshot, so the
 * model treats them identically — landing lights ON below 10000 ft.
 */
export type FlightPhase =
  | "parked"
  | "engineStart"
  | "taxi"
  | "runway"
  | "climb"
  | "cruise"
  | "descent"
  | "landing";

export interface AircraftState {
  onGround?: boolean;
  velocity?: number;    // kt
  baroAltitude?: number; // ft
}

const DESCENT_ALTITUDE_FT = 10_000;

/**
 * Heuristic phase classifier from a single ADS-B snapshot.
 *
 * Limitations:
 * - Can't distinguish parked vs engine-start without engine telemetry.
 *   Defaults to "parked" when velocity == 0.
 * - Can't distinguish climb from descent without baro rate sign.
 *   Defaults to "climb" when airborne and below 10k ft with positive
 *   or unknown baro rate; "descent" when baro rate is negative.
 * - Can't distinguish "entering runway" from taxi without additional
 *   context — treated as "taxi".
 */
export function classifyFlightPhase(state: AircraftState): FlightPhase {
  const onGround = state.onGround ?? true;
  const speed = state.velocity ?? 0;
  const alt = state.baroAltitude ?? 0;

  if (onGround) {
    if (speed <= 5) return "parked";
    return "taxi";
  }

  // Airborne
  if (alt >= DESCENT_ALTITUDE_FT) return "cruise";

  // Below 10k ft — could be climb or descent. Without baro rate sign
  // we assume climb (takeoff phase) for simplicity.
  return "climb";
}

// ---------------------------------------------------------------------------
// Phase → active lights
// ---------------------------------------------------------------------------

type PhaseLights = Record<FlightPhase, readonly string[]>;

/**
 * Which lights are illuminated in each flight phase.
 *
 * References:
 * - FAA AIM 4-3-23 "Use of Aircraft Lights"
 * - 14 CFR 91.209 "Aircraft Lights"
 * - ICAO Annex 6, Part I, Chapter 6
 */
const PHASE_LIGHTS: PhaseLights = {
  parked: [],
  engineStart: ["beaconTop", "beaconBottom"],
  taxi: ["navLeft", "navRight", "navTail", "beaconTop", "beaconBottom", "taxiLight"],
  runway: [
    "navLeft", "navRight", "navTail",
    "beaconTop", "beaconBottom",
    "strobeLeft", "strobeRight",
    "landingLight", "taxiLight",
  ],
  climb: [
    "navLeft", "navRight", "navTail",
    "beaconTop", "beaconBottom",
    "strobeLeft", "strobeRight",
    "landingLight",
  ],
  cruise: [
    "navLeft", "navRight", "navTail",
    "beaconTop", "beaconBottom",
    "strobeLeft", "strobeRight",
  ],
  descent: [
    "navLeft", "navRight", "navTail",
    "beaconTop", "beaconBottom",
    "strobeLeft", "strobeRight",
    "landingLight",
  ],
  landing: [
    "navLeft", "navRight", "navTail",
    "beaconTop", "beaconBottom",
    "strobeLeft", "strobeRight",
    "landingLight",
  ],
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ActiveLight {
  def: AircraftLightDef;
  /** Anchor point in the icon's normalized coordinate space [0…1, 0…1]. */
  x: number;
  y: number;
}

/**
 * Return the list of lights that should be active for an aircraft given
 * its current state and the pre-computed icon anchor data.
 *
 * If `anchors` is not provided (unknown icon), returns an empty array.
 */
export function resolveActiveLights(
  state: AircraftState,
  anchors?: Record<string, { x: number; y: number }>,
  family?: string,
): ActiveLight[] {
  if (!anchors) return [];

  const phase = classifyFlightPhase(state);
  const activeIds = PHASE_LIGHTS[phase];
  if (!activeIds || activeIds.length === 0) return [];

  const lights: ActiveLight[] = [];
  for (const id of activeIds) {
    const def = ALL_LIGHTS[id];
    if (!def) continue;
    // Skip strobes for balloons and unidentified icons
    if (family === "balloon" && (def.blink === "strobe" || def.blink === "beacon")) continue;
    // Skip landing/taxi lights for balloons
    if (family === "balloon" && (id === "landingLight" || id === "taxiLight" || id === "logoLight")) continue;
    const anchor = anchors[def.anchor];
    if (!anchor) continue;
    lights.push({ def, x: anchor.x, y: anchor.y });
  }
  return lights;
}
