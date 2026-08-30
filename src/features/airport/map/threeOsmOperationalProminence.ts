import type { ThreeOsmContrastMode } from "./threeOsmAccessibilityPreferences";

type ThreeOsmOperationalProminence = {
  runwayHalo: number;
  runwaySurface: number;
  approachLine: number;
  runwayLightWhite: number;
  runwayLightAmber: number;
  taxiwayLightBlue: number;
  taxiwayLightGreen: number;
  reil: number;
};

const STANDARD_PROMINENCE = Object.freeze({
  runwayHalo: 0.34,
  runwaySurface: 0.48,
  approachLine: 0.34,
  runwayLightWhite: 0.38,
  runwayLightAmber: 0.54,
  taxiwayLightBlue: 0.32,
  taxiwayLightGreen: 0.4,
  reil: 0.64,
}) satisfies ThreeOsmOperationalProminence;

const ELEVATED_PROMINENCE = Object.freeze({
  runwayHalo: 1,
  runwaySurface: 1,
  approachLine: 1,
  runwayLightWhite: 1,
  runwayLightAmber: 1,
  taxiwayLightBlue: 1,
  taxiwayLightGreen: 1,
  reil: 1,
}) satisfies ThreeOsmOperationalProminence;

/**
 * Keeps airport structure readable without competing with live aircraft.
 * Elevated and forced contrast intentionally retain full-strength geometry.
 */
export function resolveThreeOsmOperationalProminence(
  contrastMode: ThreeOsmContrastMode,
) {
  return contrastMode === "standard"
    ? STANDARD_PROMINENCE
    : ELEVATED_PROMINENCE;
}
