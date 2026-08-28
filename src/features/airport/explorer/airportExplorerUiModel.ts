import { DEFAULT_AIRCRAFT_FILTERS } from "../../aircraft/filters/aircraftFilters";
import { ZOOM_APPROACH } from "../../../utils/airportMapDisplay";
import { DEFAULT_MAP_LABEL_LEVEL } from "../map/mapLabelLevelModel";

export const DEFAULT_AIRPORT_EXPLORER_UI_STATE = {
  mapZoom: ZOOM_APPROACH,
  mapLabelLevel: DEFAULT_MAP_LABEL_LEVEL,
  showRunwayBeams: true,
  showNavaidMarkers: false,
  showReportingPoints: false,
  showAirspaces: true,
  ...DEFAULT_AIRCRAFT_FILTERS,
};

export function resolveAirportExplorerMountKey({
  icao = "",
  mode = "airport",
}: Record<string, any> = {}) {
  if (mode === "nearMe") return "nearMe";
  const normalizedIcao = String(icao || "").trim().toUpperCase();
  return `airport:${normalizedIcao || "unknown"}`;
}

export function resolveSelectedAirspaceIdForLayerVisibility({
  showAirspaces = true,
  selectedAirspaceId = "",
  airspaceId = "",
  airspaceIds = undefined,
}: Record<string, any> = {}) {
  if (!showAirspaces) return "";
  const normalizedAirspaceIds = normalizeAirspaceSelectionIds(
    airspaceIds ?? airspaceId,
  );
  if (normalizedAirspaceIds.includes(selectedAirspaceId)) {
    return selectedAirspaceId;
  }
  return normalizedAirspaceIds[0] || "";
}

export function normalizeAirspaceSelectionIds(value: unknown) {
  const values = Array.isArray(value) ? value : [value];
  return Array.from(
    new Set(
      values
        .map((item) => String(item || "").trim())
        .filter(Boolean),
    ),
  );
}

export function resolveAirspaceSelectionForLayerVisibility({
  showAirspaces = true,
  selectedAirspaceId = "",
  airspaceId = "",
  airspaceIds = undefined,
}: Record<string, any> = {}) {
  const selectedAirspaceIds = showAirspaces
    ? normalizeAirspaceSelectionIds(airspaceIds ?? airspaceId)
    : [];
  return {
    selectedAirspaceId: resolveSelectedAirspaceIdForLayerVisibility({
      showAirspaces,
      selectedAirspaceId,
      airspaceIds: selectedAirspaceIds,
    }),
    selectedAirspaceIds,
  };
}
