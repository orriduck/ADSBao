import { getDistanceNm } from "../../../utils/aircraftTrafficIntent";
import { toFiniteNumber } from "../../../utils/math";

const AIRSPACE_SOURCE_OFFICIAL = "official-airspace";
const AIRSPACE_SOURCE_HEURISTIC = "heuristic";

const ARRIVAL_VALUES = new Set(["ARRIVAL", "arrival"]);
const DEPARTURE_VALUES = new Set(["DEPARTURE", "departure"]);

type AirportContextRecord = Record<string, any>;

function resolveRangeBand(distanceNm: unknown) {
  const distance = toNullableFiniteNumber(distanceNm);
  if (distance == null) return "outside-airport-context";
  if (distance <= 2.2) return "airport-core";
  if (distance <= 10) return "terminal-inner";
  if (distance <= 30) return "terminal-outer";
  return "outside-airport-context";
}

function resolveAltitudeBand({
  altitudeFtMsl,
  onGround = false,
}: {
  altitudeFtMsl?: unknown;
  onGround?: boolean;
} = {}) {
  if (onGround) return "surface-tower";
  const altitude = toNullableFiniteNumber(altitudeFtMsl);
  if (altitude == null) return "unknown";
  if (altitude < 2500) return "surface-tower";
  if (altitude < 7000) return "terminal-low";
  if (altitude < 12000) return "terminal-high";
  if (altitude < 18000) return "enroute";
  return "class-a";
}

function resolveVisibilityRole({
  rangeBand,
  altitudeBand,
  movement = "unknown",
  airspace = null,
}: {
  rangeBand?: string;
  altitudeBand?: string;
  movement?: string;
  airspace?: AirportContextRecord | null;
} = {}) {
  if (isRouteTerminalMovement(movement)) {
    return rangeBand === "outside-airport-context" ? "secondary" : "primary";
  }

  if (altitudeBand === "enroute" || altitudeBand === "class-a") {
    return "dimmed";
  }

  if (airspace?.matched && isTerminalAirspace(airspace)) {
    return rangeBand === "outside-airport-context" ? "secondary" : "primary";
  }

  if (
    rangeBand === "airport-core" ||
    rangeBand === "terminal-inner" ||
    rangeBand === "terminal-outer"
  ) {
    return "secondary";
  }

  return "dimmed";
}

function resolveAirportContextGroup({
  rangeBand,
  altitudeBand,
  movement = "unknown",
}: {
  rangeBand?: string;
  altitudeBand?: string;
  movement?: string;
  airspace?: AirportContextRecord | null;
} = {}) {
  if (isRouteTerminalMovement(movement)) {
    return "Terminal Flow";
  }

  if (rangeBand === "airport-core" || altitudeBand === "surface-tower") {
    return "Airport Area";
  }

  if (altitudeBand === "enroute" || altitudeBand === "class-a") {
    return "High / Passing Over";
  }

  return "Unknown";
}

function matchesAirspaceVolume(
  aircraft: AirportContextRecord = {},
  volume: AirportContextRecord | null = null,
) {
  if (!volume?.geometry) return false;
  const lat = toFiniteNumber(aircraft.lat);
  const lon = toFiniteNumber(aircraft.lon);
  const altitude = toNullableFiniteNumber(aircraft.altitude);

  if (lat == null || lon == null || altitude == null) return false;
  if (altitude < volume.floorFtMsl || altitude > volume.ceilingFtMsl) {
    return false;
  }

  return pointInGeoJsonGeometry([lon, lat], volume.geometry);
}

export function enrichAircraftWithAirportContext({
  aircraft = [],
  airportProfile = {},
  airspaceVolumes = [],
}: {
  aircraft?: AirportContextRecord[];
  airportProfile?: AirportContextRecord;
  airspaceVolumes?: AirportContextRecord[];
} = {}) {
  const airportIcao = String(airportProfile?.icao || "").toUpperCase();
  const airportLat = toFiniteNumber(airportProfile?.lat);
  const airportLon = toFiniteNumber(airportProfile?.lon);
  const volumes = airspaceVolumes.filter(
    (volume) =>
      !airportIcao ||
      !volume?.airportIcao ||
      String(volume.airportIcao).toUpperCase() === airportIcao,
  );

  return aircraft.map((item) => {
    const existingDistance = toNullableFiniteNumber(item.distanceNm);
    const distanceNm =
      existingDistance ??
      getDistanceNm(item.lat, item.lon, airportLat, airportLon);
    const movement = normalizeMovement(item.movement ?? item.trafficIntent);
    const rangeBand = resolveRangeBand(distanceNm);
    const altitudeBand = resolveAltitudeBand({
      altitudeFtMsl: item.altitude,
      onGround: item.onGround,
    });
    const matchedVolume = volumes.find((volume) =>
      matchesAirspaceVolume(item, volume),
    );
    const airspace: AirportContextRecord = matchedVolume
      ? airspaceMatchFromVolume(matchedVolume)
      : {
          matched: false,
          source: AIRSPACE_SOURCE_HEURISTIC,
        };
    const group = resolveAirportContextGroup({
      rangeBand,
      altitudeBand,
      movement,
      airspace,
    });
    const visibilityRole = resolveVisibilityRole({
      rangeBand,
      altitudeBand,
      movement,
      airspace,
    });

    return {
      ...item,
      distanceNm,
      airportContext: {
        airportIcao,
        distanceNm,
        movement,
        rangeBand,
        altitudeBand,
        visibilityRole,
        airspace,
        display: {
          group,
          label: resolveContextLabel({ group, rangeBand, altitudeBand, airspace }),
          confidence: airspace.matched
            ? "official-airspace-match"
            : "estimated",
        },
      },
    };
  });
}

function normalizeMovement(value: unknown) {
  const normalized = String(value || "");
  if (ARRIVAL_VALUES.has(normalized)) return "arrival";
  if (DEPARTURE_VALUES.has(normalized)) return "departure";
  return "unknown";
}

function isRouteTerminalMovement(movement: unknown) {
  return movement === "arrival" || movement === "departure";
}

function toNullableFiniteNumber(value: unknown) {
  if (value == null || value === "") return null;
  return toFiniteNumber(value);
}

function airspaceMatchFromVolume(volume: AirportContextRecord) {
  return {
    matched: true,
    source: volume.source || AIRSPACE_SOURCE_OFFICIAL,
    classType: volume.classType,
    name: volume.name,
    label: volume.label,
    floorFtMsl: volume.floorFtMsl,
    ceilingFtMsl: volume.ceilingFtMsl,
  };
}

function isTerminalAirspace(airspace: AirportContextRecord | null | undefined) {
  return (
    airspace?.matched &&
    ["B", "C", "D"].includes(String(airspace.classType || "").toUpperCase())
  );
}

function resolveContextLabel({
  group,
  rangeBand,
  altitudeBand,
  airspace,
}: {
  group?: string;
  rangeBand?: string;
  altitudeBand?: string;
  airspace?: AirportContextRecord | null;
}) {
  if (airspace?.matched && airspace.label) {
    return `${airspace.classType || "Airspace"} ${airspace.label}`;
  }
  if (group === "Airport Area") return "Airport area";
  if (group === "Terminal Flow") return `${rangeBand} / ${altitudeBand}`;
  if (group === "High / Passing Over") return altitudeBand;
  return "Context unknown";
}

function pointInGeoJsonGeometry(point: number[], geometry: AirportContextRecord) {
  if (geometry.type === "Polygon") {
    return pointInPolygon(point, geometry.coordinates);
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((polygon) => pointInPolygon(point, polygon));
  }
  return false;
}

function pointInPolygon(point: number[], rings: number[][][] = []) {
  if (!rings.length || !pointInRing(point, rings[0])) return false;
  return !rings.slice(1).some((ring) => pointInRing(point, ring));
}

function pointInRing([x, y]: number[], ring: number[][] = []) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}
