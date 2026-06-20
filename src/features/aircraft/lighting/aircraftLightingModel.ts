/**
 * Aircraft exterior lighting model.
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
 * Dense airport maps can render hundreds of aircraft light nodes. Keep the
 * visible model deliberately small: no navigation, beacon, or strobe effects;
 * the map may render one static headlight in night mode.
 */

// ---------------------------------------------------------------------------
// Light definitions
// ---------------------------------------------------------------------------

type LightColor = "white";

/** Blink pattern for aircraft marker lights. Kept static on map hot paths. */
type BlinkPattern = "steady";

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

/** Runtime marker light catalogue. Keep this intentionally tiny. */
export const ALL_LIGHTS: Record<string, AircraftLightDef> = {
  headLight: {
    id: "headLight",
    label: "头灯",
    color: "white",
    anchor: "landingLight",
    blink: "steady",
    animationClass: "aircraft-light--head",
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
 * model treats them identically.
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

const PHASE_LIGHTS: PhaseLights = {
  parked: [],
  engineStart: [],
  taxi: ["headLight"],
  runway: ["headLight"],
  climb: ["headLight"],
  cruise: ["headLight"],
  descent: ["headLight"],
  landing: ["headLight"],
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
    if (family === "balloon") continue;
    const anchor = anchors[def.anchor];
    if (!anchor) continue;
    lights.push({ def, x: anchor.x, y: anchor.y });
  }
  return lights;
}
