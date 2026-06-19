import { AIRPORT_FALLBACKS, COORDS } from "../../../data/airportFallbacks";
import { enrichAircraftWithAirportContext } from "../context/airportContextModel";
import { buildNavaidLabels } from "../map/navaidLabelModel";
import { buildReportingPointLabels } from "../map/reportingPointLabelModel";

type AirportExplorerRecord = Record<string, any>;

export function resolveAirportProfile({ icao = "", airport = null }: AirportExplorerRecord = {}) {
  const routeIcao = normalizeAirportProfileCode(icao);
  const airportIcao = normalizeAirportProfileCode(
    airport?.icao || airport?.code || airport?.ident,
  );
  const useAirportDetails = Boolean(
    airport && (!routeIcao || !airportIcao || airportIcao === routeIcao),
  );
  const normalizedIcao = routeIcao || airportIcao;
  const airportFallback = AIRPORT_FALLBACKS[normalizedIcao] || null;
  const airportCodeLabel =
    (useAirportDetails ? airport?.iata : "") ||
    airportFallback?.iata ||
    normalizedIcao;

  return {
    icao: normalizedIcao,
    iata: airportCodeLabel,
    name: useAirportDetails
      ? String(airport?.name || "")
      : airportFallback?.name || normalizedIcao || "Airport",
    localizedName: useAirportDetails ? airport?.localizedName || "" : "",
    city:
      (useAirportDetails ? airport?.city : "") || airportFallback?.city || "",
    country:
      (useAirportDetails ? airport?.country : "") ||
      airportFallback?.country ||
      "",
    lat: COORDS[normalizedIcao]?.[0] || (useAirportDetails ? airport?.lat : 0) || 0,
    lon: COORDS[normalizedIcao]?.[1] || (useAirportDetails ? airport?.lon : 0) || 0,
    elevationFt: useAirportDetails ? airport?.elevationFt ?? null : null,
  };
}

function normalizeAirportProfileCode(value: unknown) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

export function enrichAircraftWithRoutes({
  aircraft = [],
  routesByCallsign = {},
  airportProfile,
  airspaceVolumes = [],
}: AirportExplorerRecord = {}): AirportExplorerRecord[] {
  return enrichAircraftWithAirportContext({
    aircraft,
    airportProfile,
    airspaceVolumes,
    routesByCallsign,
  });
}

const aircraftSelectionId = (aircraft: AirportExplorerRecord | null | undefined) => aircraft?.icao24 || aircraft?.callsign || "";

const LIVE_POSITION_FIELDS = [
  "lat",
  "lon",
  "altitude",
  "baroRate",
  "geomRate",
  "navAltitudeMcp",
  "onGround",
  "velocity",
  "track",
  "positionTime",
  "receiveTime",
  "positionQuality",
];

export function mergeTrackedAircraftIntoNearby({
  trackedAircraft = null,
  nearbyAircraft = [],
}: AirportExplorerRecord = {}) {
  if (!trackedAircraft) return nearbyAircraft;

  const trackedKey = aircraftSelectionId(trackedAircraft);
  const matchIndex = nearbyAircraft.findIndex(
    (item) => trackedKey && aircraftSelectionId(item) === trackedKey,
  );

  if (matchIndex < 0) return [trackedAircraft, ...nearbyAircraft];

  const nearbyMatch = nearbyAircraft[matchIndex];
  const merged = {
    ...nearbyMatch,
    ...trackedAircraft,
  };

  for (const field of LIVE_POSITION_FIELDS) {
    if (nearbyMatch[field] != null) merged[field] = nearbyMatch[field];
  }

  return nearbyAircraft.map((item, index) =>
    index === matchIndex ? merged : item,
  );
}

export function resolveAirportExplorerSelection({
  aircraft = [],
  selectedAircraftId = "",
  airports = [],
  selectedAirportIcao = "",
  navaids = [],
  selectedNavaidKey = "",
  reportingPoints = [],
  selectedReportingPointKey = "",
  airspaces = [],
  selectedAirspaceId = "",
  candidateWatchingSpots = [],
  selectedCandidateWatchingSpotId = "",
}: AirportExplorerRecord = {}) {
  const selectedAircraft =
    aircraft.find((item) => aircraftSelectionId(item) === selectedAircraftId) ||
    null;
  const selectedAirport =
    airports.find((airport) => airport?.icao === selectedAirportIcao) || null;
  const navaidLabels = buildNavaidLabels(navaids);
  const selectedNavaid =
    navaidLabels.find((navaid) => navaid?.key === selectedNavaidKey) || null;
  const reportingPointLabels = buildReportingPointLabels(reportingPoints);
  const selectedReportingPoint =
    reportingPointLabels.find(
      (point) => point?.key === selectedReportingPointKey,
    ) || null;
  const selectedAirspace =
    airspaces.find((airspace) => airspace?.id === selectedAirspaceId) || null;
  const selectedCandidateWatchingSpot =
    candidateWatchingSpots.find(
      (spot) => spot?.id === selectedCandidateWatchingSpotId,
    ) || null;

  return {
    selectedAircraft,
    selectedAircraftStillVisible: !selectedAircraftId || Boolean(selectedAircraft),
    selectedAirport,
    selectedNavaid,
    selectedNavaidStillVisible: !selectedNavaidKey || Boolean(selectedNavaid),
    selectedReportingPoint,
    selectedReportingPointStillVisible:
      !selectedReportingPointKey || Boolean(selectedReportingPoint),
    selectedAirspace,
    selectedAirspaceStillVisible: !selectedAirspaceId || Boolean(selectedAirspace),
    selectedCandidateWatchingSpot,
    selectedCandidateWatchingSpotStillVisible:
      !selectedCandidateWatchingSpotId || Boolean(selectedCandidateWatchingSpot),
  };
}
