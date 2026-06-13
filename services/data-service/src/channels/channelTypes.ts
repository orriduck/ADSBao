import type {
  PollingTarget,
  RealtimeChannelType,
  SubscribeParams,
} from "../types.js";

const MAX_AIRCRAFT_RANGE_NM = 250;
const DEFAULT_AIRPORT_RANGE_NM = 40;
const VIEWPORT_GRID_DEGREES = 0.1;
const BBOX_GRID_DEGREES = 0.25;
const MAX_BBOX_SPAN_DEGREES = 5;
const EARTH_RADIUS_NM = 3440.065;

type ChannelResult =
  | {
      ok: true;
      channel: string;
      type: RealtimeChannelType;
    }
  | {
      ok: false;
      error: string;
    };

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isLatitude(value: number | null): value is number {
  return value != null && value >= -90 && value <= 90;
}

function isLongitude(value: number | null): value is number {
  return value != null && value >= -180 && value <= 180;
}

function clampRangeNm(value: unknown, fallback = DEFAULT_AIRPORT_RANGE_NM) {
  const number = toNumber(value);
  const next = number == null ? fallback : number;
  return Math.max(1, Math.min(MAX_AIRCRAFT_RANGE_NM, Math.round(next)));
}

function roundToGrid(value: number, grid: number) {
  return Number((Math.round(value / grid) * grid).toFixed(4));
}

function floorToGrid(value: number, grid: number) {
  return Number((Math.floor(value / grid) * grid).toFixed(4));
}

function ceilToGrid(value: number, grid: number) {
  return Number((Math.ceil(value / grid) * grid).toFixed(4));
}

function formatNumber(value: number) {
  return String(Number(value.toFixed(4)));
}

function haversineNm(
  firstLat: number,
  firstLon: number,
  secondLat: number,
  secondLon: number,
) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(secondLat - firstLat);
  const dLon = toRadians(secondLon - firstLon);
  const lat1 = toRadians(firstLat);
  const lat2 = toRadians(secondLat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.sqrt(a));
}

function normalizeAirportChannel(value: string): ChannelResult {
  const icao = value.trim().toUpperCase();
  if (!/^[A-Z0-9]{3,6}$/.test(icao)) {
    return { ok: false, error: "Invalid airport channel ICAO" };
  }
  return { ok: true, channel: `airport:${icao}`, type: "airport" };
}

function normalizeAircraftChannel(value: string): ChannelResult {
  const hex = value.trim().toUpperCase();
  if (!/^[A-F0-9]{6}$/.test(hex)) {
    return { ok: false, error: "Invalid aircraft channel hex" };
  }
  return { ok: true, channel: `aircraft:${hex}`, type: "aircraft" };
}

function normalizeCallsignChannel(value: string): ChannelResult {
  const callsign = value.trim().toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z0-9]{2,12}$/.test(callsign)) {
    return { ok: false, error: "Invalid callsign channel" };
  }
  return { ok: true, channel: `callsign:${callsign}`, type: "callsign" };
}

function normalizeViewportChannel(value: string): ChannelResult {
  const [rawLat, rawLon, rawDist] = value.split(":");
  const lat = toNumber(rawLat);
  const lon = toNumber(rawLon);
  if (!isLatitude(lat) || !isLongitude(lon)) {
    return { ok: false, error: "Invalid viewport channel coordinates" };
  }
  const roundedLat = roundToGrid(lat, VIEWPORT_GRID_DEGREES);
  const roundedLon = roundToGrid(lon, VIEWPORT_GRID_DEGREES);
  const distNm = clampRangeNm(rawDist);
  return {
    ok: true,
    channel: `viewport:${formatNumber(roundedLat)}:${formatNumber(roundedLon)}:${distNm}`,
    type: "viewport",
  };
}

function normalizeBboxChannel(value: string): ChannelResult {
  const parts = value.split(",").map((item) => toNumber(item.trim()));
  if (parts.length !== 4) {
    return { ok: false, error: "Invalid bbox channel shape" };
  }

  const [rawSouth, rawWest, rawNorth, rawEast] = parts;
  if (
    !isLatitude(rawSouth) ||
    !isLatitude(rawNorth) ||
    !isLongitude(rawWest) ||
    !isLongitude(rawEast) ||
    rawSouth >= rawNorth ||
    rawWest >= rawEast
  ) {
    return { ok: false, error: "Invalid bbox channel coordinates" };
  }

  const south = floorToGrid(rawSouth, BBOX_GRID_DEGREES);
  const west = floorToGrid(rawWest, BBOX_GRID_DEGREES);
  const north = ceilToGrid(rawNorth, BBOX_GRID_DEGREES);
  const east = ceilToGrid(rawEast, BBOX_GRID_DEGREES);

  if (
    north - south > MAX_BBOX_SPAN_DEGREES ||
    east - west > MAX_BBOX_SPAN_DEGREES
  ) {
    return { ok: false, error: "Bbox channel is too large" };
  }

  return {
    ok: true,
    channel: `bbox:${formatNumber(south)},${formatNumber(west)},${formatNumber(north)},${formatNumber(east)}`,
    type: "bbox",
  };
}

function normalizeScopedChannel(
  type: "camera" | "session",
  value: string,
): ChannelResult {
  const id = value.trim();
  if (!/^[A-Za-z0-9._-]{3,80}$/.test(id)) {
    return { ok: false, error: `Invalid ${type} channel id` };
  }
  return { ok: true, channel: `${type}:${id}`, type };
}

export function normalizeChannelName(input: unknown): ChannelResult {
  const raw = String(input || "").trim();
  const separatorIndex = raw.indexOf(":");
  if (separatorIndex <= 0) {
    return { ok: false, error: "Channel must be type:value" };
  }

  const type = raw.slice(0, separatorIndex).toLowerCase();
  const value = raw.slice(separatorIndex + 1);
  if (type === "airport") return normalizeAirportChannel(value);
  if (type === "aircraft") return normalizeAircraftChannel(value);
  if (type === "bbox") return normalizeBboxChannel(value);
  if (type === "callsign") return normalizeCallsignChannel(value);
  if (type === "camera") return normalizeScopedChannel("camera", value);
  if (type === "session") return normalizeScopedChannel("session", value);
  if (type === "viewport") return normalizeViewportChannel(value);
  return { ok: false, error: `Unsupported channel type: ${type}` };
}

function parseViewportChannel(channel: string): PollingTarget {
  const [, rawLat, rawLon, rawDist] = channel.split(":");
  const lat = Number(rawLat);
  const lon = Number(rawLon);
  return {
    kind: "positions",
    lat,
    lon,
    distNm: clampRangeNm(rawDist),
  };
}

function parseBboxChannel(channel: string): PollingTarget {
  const [, payload] = channel.split(":");
  const [south, west, north, east] = payload
    .split(",")
    .map((item) => Number(item));
  const lat = Number(((south + north) / 2).toFixed(4));
  const lon = Number(((west + east) / 2).toFixed(4));
  const radiusNm = Math.ceil(haversineNm(south, west, north, east) / 2);
  return {
    kind: "positions",
    lat,
    lon,
    distNm: Math.max(1, Math.min(MAX_AIRCRAFT_RANGE_NM, radiusNm)),
  };
}

export function buildChannelPollingTarget(
  input: string,
  params: SubscribeParams = {},
): PollingTarget {
  const normalized = normalizeChannelName(input);
  if (normalized.ok !== true) throw new Error(normalized.error);

  if (normalized.type === "airport") {
    const lat = toNumber(params.lat);
    const lon = toNumber(params.lon);
    if (!isLatitude(lat) || !isLongitude(lon)) {
      throw new Error("Airport channel requires lat/lon subscription params");
    }
    return {
      kind: "positions",
      lat,
      lon,
      distNm: clampRangeNm(params.distNm),
    };
  }

  if (normalized.type === "viewport") {
    return parseViewportChannel(normalized.channel);
  }

  if (normalized.type === "bbox") {
    return parseBboxChannel(normalized.channel);
  }

  if (normalized.type === "callsign") {
    return {
      kind: "callsign",
      callsign: normalized.channel.slice("callsign:".length),
    };
  }

  if (normalized.type === "aircraft") {
    return {
      kind: "aircraft",
      hex: normalized.channel.slice("aircraft:".length),
    };
  }

  throw new Error(`${normalized.type} channel does not have an active polling target`);
}

export function getChannelType(channel: string): RealtimeChannelType {
  const normalized = normalizeChannelName(channel);
  if (normalized.ok !== true) throw new Error(normalized.error);
  return normalized.type;
}

export function getChannelBaseIntervalMs(type: RealtimeChannelType) {
  if (type === "airport" || type === "aircraft" || type === "callsign") {
    return 3_000;
  }
  if (type === "bbox" || type === "viewport") {
    return 5_000;
  }
  return 15_000;
}
