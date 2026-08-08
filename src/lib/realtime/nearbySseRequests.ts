import { normalizeCallsign } from "@/utils/callsign";
import type { NearbySseRequest } from "./nearbySseClient";

function finiteCoordinate(value: unknown, min: number, max: number) {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate >= min && coordinate <= max
    ? coordinate
    : null;
}

function formatCoordinate(value: number) {
  const rounded = Number(value.toFixed(2));
  return (Object.is(rounded, -0) ? 0 : rounded).toFixed(2);
}

/** A coordinate channel is intentionally independent of display radius. */
export function buildNearbyCoordinateRequest({
  lat,
  lon,
}: {
  lat: unknown;
  lon: unknown;
}): NearbySseRequest | null {
  const latitude = finiteCoordinate(lat, -90, 90);
  const longitude = finiteCoordinate(lon, -180, 180);
  if (latitude == null || longitude == null) return null;
  const normalizedLat = formatCoordinate(latitude);
  const normalizedLon = formatCoordinate(longitude);
  const channel = `nearby:${normalizedLat}:${normalizedLon}`;
  return {
    key: channel,
    channel,
    url: `/events/nearby/coordinates/${encodeURIComponent(normalizedLat)}/${encodeURIComponent(normalizedLon)}`,
  };
}

export function buildNearbyCallsignRequest(callsign: unknown): NearbySseRequest | null {
  const normalized = normalizeCallsign(callsign);
  if (!normalized) return null;
  const channel = `nearby:${normalized}`;
  return {
    key: channel,
    channel,
    url: `/events/nearby/callsign/${encodeURIComponent(normalized)}`,
  };
}
