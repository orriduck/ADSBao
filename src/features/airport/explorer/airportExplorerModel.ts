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

function normalizeAircraftHex(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeAircraftCallsign(value: unknown) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function sameAircraftRecord(
  a: AirportExplorerRecord | null | undefined,
  b: AirportExplorerRecord | null | undefined,
) {
  const aHex = normalizeAircraftHex(a?.icao24);
  const bHex = normalizeAircraftHex(b?.icao24);
  if (aHex && bHex && aHex === bHex) return true;

  const aCallsign = normalizeAircraftCallsign(a?.callsign);
  const bCallsign = normalizeAircraftCallsign(b?.callsign);
  return Boolean(aCallsign && bCallsign && aCallsign === bCallsign);
}

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

  const matchIndex = nearbyAircraft.findIndex(
    (item) => sameAircraftRecord(trackedAircraft, item),
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
  selectedAirspaceIds = [],
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
  const selectedAirspaceIdSet = new Set(
    normalizeSelectedAirspaceIds(selectedAirspaceIds, selectedAirspaceId),
  );
  const selectedAirspaces =
    selectedAirspaceIdSet.size > 0
      ? airspaces.filter((airspace) =>
          selectedAirspaceIdSet.has(String(airspace?.id || "")),
        )
      : [];
  const selectedAirspace =
    selectedAirspaces.find(
      (airspace) => String(airspace?.id || "") === selectedAirspaceId,
    ) ||
    selectedAirspaces[0] ||
    null;
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
    selectedAirspaces,
    selectedAirspaceStillVisible: !selectedAirspaceId || Boolean(selectedAirspace),
    selectedCandidateWatchingSpot,
    selectedCandidateWatchingSpotStillVisible:
      !selectedCandidateWatchingSpotId || Boolean(selectedCandidateWatchingSpot),
  };
}

function normalizeSelectedAirspaceIds(ids: unknown, fallbackId = "") {
  const values = Array.isArray(ids) ? ids : [ids];
  const normalized = Array.from(
    new Set(
      values
        .map((id) => String(id || "").trim())
        .filter(Boolean),
    ),
  );
  const normalizedFallbackId = String(fallbackId || "").trim();
  if (normalized.length === 0 && normalizedFallbackId) {
    return [normalizedFallbackId];
  }
  return normalized;
}
