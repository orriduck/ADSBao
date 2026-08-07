import { toRadians } from "@/utils/math";

type Point = { lat: number; lon: number };
type RecordLike = Record<string, unknown>;

function asRecord(value: unknown): RecordLike | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordLike)
    : null;
}

function toPoint(value: unknown): Point | null {
  const record = asRecord(value);
  const lat = Number(record?.lat);
  const lon = Number(record?.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

function angleBetween(from: Point, to: Point) {
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);
  const deltaLat = toLat - fromLat;
  const deltaLon = toRadians(to.lon - from.lon);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLon / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function initialBearing(from: Point, to: Point) {
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);
  const deltaLon = toRadians(to.lon - from.lon);
  return Math.atan2(
    Math.sin(deltaLon) * Math.cos(toLat),
    Math.cos(fromLat) * Math.sin(toLat) -
      Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLon),
  );
}

// Resolve the nearest along-track point on the route's great circle. This
// makes a diverted flight remain visually near its true journey point instead
// of overstating progress by measuring a diagonal straight to the origin.
function alongTrackFraction(origin: Point, destination: Point, aircraft: Point) {
  const routeAngle = angleBetween(origin, destination);
  if (!(routeAngle > 1e-9)) return null;

  const aircraftAngle = angleBetween(origin, aircraft);
  const routeBearing = initialBearing(origin, destination);
  const aircraftBearing = initialBearing(origin, aircraft);
  const alongTrackAngle = Math.atan2(
    Math.sin(aircraftAngle) * Math.cos(aircraftBearing - routeBearing),
    Math.cos(aircraftAngle),
  );

  if (!Number.isFinite(alongTrackAngle)) return null;
  return Math.min(1, Math.max(0, alongTrackAngle / routeAngle));
}

export function resolveFlightRouteProgress({
  route,
  aircraft,
}: {
  route?: unknown;
  aircraft?: unknown;
} = {}) {
  const routeRecord = asRecord(route);
  const aircraftRecord = asRecord(aircraft);
  const origin = toPoint(routeRecord?.origin);
  const destination = toPoint(routeRecord?.destination);
  const aircraftPosition = toPoint(aircraftRecord);

  if (!origin || !destination || !aircraftPosition) return null;

  if (aircraftRecord?.onGround === true) {
    const distanceFromOrigin = angleBetween(origin, aircraftPosition);
    const distanceFromDestination = angleBetween(destination, aircraftPosition);
    return distanceFromOrigin <= distanceFromDestination ? 0 : 1;
  }

  return alongTrackFraction(origin, destination, aircraftPosition);
}
