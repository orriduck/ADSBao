import { getDistanceNm } from "../../utils/aircraftTrafficIntent.js";
import { toFiniteNumber } from "../../utils/math.js";

const AIRSPACE_SOURCE_FAA = "faa-class-airspace";
const AIRSPACE_SOURCE_HEURISTIC = "heuristic";

const AIRSPACE_CLASSES = new Set(["B", "C", "D", "E"]);

const ARRIVAL_VALUES = new Set(["ARRIVAL", "arrival"]);
const DEPARTURE_VALUES = new Set(["DEPARTURE", "departure"]);

export function resolveRangeBand(distanceNm) {
  const distance = toNullableFiniteNumber(distanceNm);
  if (distance == null) return "outside-airport-context";
  if (distance <= 2.2) return "airport-core";
  if (distance <= 10) return "terminal-inner";
  if (distance <= 30) return "terminal-outer";
  return "outside-airport-context";
}

export function resolveAltitudeBand({ altitudeFtMsl, onGround = false } = {}) {
  if (onGround) return "surface-tower";
  const altitude = toNullableFiniteNumber(altitudeFtMsl);
  if (altitude == null) return "unknown";
  if (altitude < 2500) return "surface-tower";
  if (altitude < 7000) return "terminal-low";
  if (altitude < 12000) return "terminal-high";
  if (altitude < 18000) return "enroute";
  return "class-a";
}

export function resolveVisibilityRole({
  rangeBand,
  altitudeBand,
  movement = "unknown",
  airspace = null,
} = {}) {
  if (altitudeBand === "enroute" || altitudeBand === "class-a") {
    return "dimmed";
  }

  if (
    movement === "arrival" ||
    movement === "departure" ||
    (airspace?.matched && isTerminalAirspace(airspace))
  ) {
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

export function resolveAirportContextGroup({
  rangeBand,
  altitudeBand,
  movement = "unknown",
  airspace = null,
} = {}) {
  if (rangeBand === "airport-core" || altitudeBand === "surface-tower") {
    return "Airport Area";
  }

  if (altitudeBand === "enroute" || altitudeBand === "class-a") {
    return "High / Passing Over";
  }

  if (
    isTerminalAirspace(airspace) ||
    movement === "arrival" ||
    movement === "departure" ||
    rangeBand === "terminal-inner" ||
    rangeBand === "terminal-outer"
  ) {
    return "Terminal Flow";
  }

  return "Unknown";
}

export function createAirspaceVolumeFromFaaRecord(record = {}, options = {}) {
  const classType = String(record.CLASS || record.classType || "").toUpperCase();
  if (!AIRSPACE_CLASSES.has(classType)) return null;

  const airportIcao = String(
    options.airportIcao || record.airportIcao || record.IDENT || "",
  )
    .toUpperCase()
    .replace(/^(?!K[A-Z0-9]{3}$)([A-Z]{3})$/, "K$1");
  const name = String(record.NAME || record.name || "").trim();
  const sector = String(record.SECTOR || record.sector || "").trim();
  const floorFtMsl = parseFaaAltitudeFt(record.LOWER_VAL, record.LOWER_CODE);
  const ceilingFtMsl = parseFaaAltitudeFt(record.UPPER_VAL, record.UPPER_CODE);

  if (!airportIcao || floorFtMsl == null || ceilingFtMsl == null) return null;

  const label = `${formatChartAltitude(ceilingFtMsl)}/${formatChartAltitude(
    floorFtMsl,
    record.LOWER_CODE,
  )}`;
  const id = [
    "faa-class-airspace",
    airportIcao,
    classType,
    slugify(sector || name || "volume"),
    label.replace("/", "-"),
    options.sourceRecordId ? slugify(options.sourceRecordId) : "",
  ]
    .filter(Boolean)
    .join(":");

  return {
    id,
    airportIcao,
    classType,
    name,
    label,
    sector,
    floorFtMsl,
    ceilingFtMsl,
    geometry: options.geometry || record.geometry || null,
    source: AIRSPACE_SOURCE_FAA,
  };
}

export function matchesAirspaceVolume(aircraft = {}, volume = null) {
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
    const airspace = matchedVolume
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

function normalizeMovement(value) {
  if (ARRIVAL_VALUES.has(value)) return "arrival";
  if (DEPARTURE_VALUES.has(value)) return "departure";
  return "unknown";
}

function parseFaaAltitudeFt(value, code) {
  const normalizedCode = String(code || "").toUpperCase();
  if (normalizedCode === "SFC") return 0;
  const altitude = toNullableFiniteNumber(value);
  if (altitude == null || altitude <= -9998) return null;
  return altitude;
}

function toNullableFiniteNumber(value) {
  if (value == null || value === "") return null;
  return toFiniteNumber(value);
}

function formatChartAltitude(valueFt, code = "") {
  if (String(code || "").toUpperCase() === "SFC" || valueFt === 0) {
    return "SFC";
  }
  if (Number.isFinite(valueFt) && valueFt % 100 === 0) {
    return String(valueFt / 100);
  }
  return String(valueFt);
}

function airspaceMatchFromVolume(volume) {
  return {
    matched: true,
    source: volume.source || AIRSPACE_SOURCE_FAA,
    classType: volume.classType,
    name: volume.name,
    label: volume.label,
    floorFtMsl: volume.floorFtMsl,
    ceilingFtMsl: volume.ceilingFtMsl,
  };
}

function isTerminalAirspace(airspace) {
  return (
    airspace?.matched &&
    ["B", "C", "D"].includes(String(airspace.classType || "").toUpperCase())
  );
}

function resolveContextLabel({ group, rangeBand, altitudeBand, airspace }) {
  if (airspace?.matched && airspace.label) {
    return `${airspace.classType || "Airspace"} ${airspace.label}`;
  }
  if (group === "Airport Area") return "Airport area";
  if (group === "Terminal Flow") return `${rangeBand} / ${altitudeBand}`;
  if (group === "High / Passing Over") return altitudeBand;
  return "Context unknown";
}

function pointInGeoJsonGeometry(point, geometry) {
  if (geometry.type === "Polygon") {
    return pointInPolygon(point, geometry.coordinates);
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((polygon) => pointInPolygon(point, polygon));
  }
  return false;
}

function pointInPolygon(point, rings = []) {
  if (!rings.length || !pointInRing(point, rings[0])) return false;
  return !rings.slice(1).some((ring) => pointInRing(point, ring));
}

function pointInRing([x, y], ring = []) {
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

function slugify(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
