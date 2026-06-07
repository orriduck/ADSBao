import { formatDistance } from "@/utils/units";
import type { DistanceUnit } from "@/features/app-shell/unitPreferences/unitPreferencesModel";

// Shared distance formatter for the nearby-airport / nearby-aircraft list
// surfaces. Honors the user's distance unit preference (defaults to NM so the
// existing call sites keep their previous behavior).
export function formatNearbyDistanceDisplay(
  distanceNm: unknown,
  unit: DistanceUnit = "nm",
) {
  return formatDistance(distanceNm, unit, { precision: 0 });
}
