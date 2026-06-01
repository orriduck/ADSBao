import { resolveAircraftDisplayModel } from "../aircraftTypeDisplayModel";

export function getAircraftPreviewTypeDisplay(aircraft) {
  const display = resolveAircraftDisplayModel(aircraft);
  const primary = display.icaoType || display.displayName;
  const secondary =
    display.icaoType && display.displayName !== display.icaoType
      ? display.displayName
      : null;

  return {
    primary,
    secondary,
    icaoType: display.icaoType,
    category: display.category,
  };
}
