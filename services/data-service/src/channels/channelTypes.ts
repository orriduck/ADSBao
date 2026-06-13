import type {
  PollingTarget,
  RealtimeChannelType,
  SubscribeParams,
} from "../types.js";

const MAX_AIRCRAFT_RANGE_NM = 250;
const DEFAULT_AIRPORT_RANGE_NM = 40;
const CENTER_GRID_DEGREES = 0.1;

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

function roundToGrid(value: number, grid = CENTER_GRID_DEGREES) {
  return Number((Math.round(value / grid) * grid).toFixed(4));
}

function formatNumber(value: number) {
  return String(Number(value.toFixed(4)));
}

function normalizeAirportIcao(value: unknown) {
  const icao = String(value || "").trim().toUpperCase();
  return /^[A-Z][A-Z0-9]{3}$/.test(icao) ? icao : "";
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

function normalizeTrafficChannel(value: string): ChannelResult {
  const [anchor, ...parts] = value.split(":");
  if (anchor === "center") {
    if (parts.length !== 3) {
      return { ok: false, error: "Invalid traffic center channel" };
    }
    const [rawLat, rawLon, rawDist] = parts;
    const lat = toNumber(rawLat);
    const lon = toNumber(rawLon);
    if (!isLatitude(lat) || !isLongitude(lon)) {
      return { ok: false, error: "Invalid traffic center channel" };
    }
    const roundedLat = roundToGrid(lat);
    const roundedLon = roundToGrid(lon);
    const distNm = clampRangeNm(rawDist);
    return {
      ok: true,
      channel: `traffic:center:${formatNumber(roundedLat)}:${formatNumber(roundedLon)}:${distNm}`,
      type: "traffic",
    };
  }

  return { ok: false, error: "Invalid traffic channel anchor" };
}

function normalizeRouteCallsign(value: unknown) {
  const callsign = String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  return /^[A-Z][A-Z0-9]{2,7}$/.test(callsign) ? callsign : "";
}

function normalizeRouteChannel(value: string): ChannelResult {
  const [rawCallsign, anchor, ...parts] = value.split(":");
  const callsign = normalizeRouteCallsign(rawCallsign);
  if (!callsign) return { ok: false, error: "Invalid route channel callsign" };

  if (!anchor) {
    return { ok: true, channel: `route:${callsign}`, type: "route" };
  }

  if (anchor === "airport") {
    if (parts.length !== 1) {
      return { ok: false, error: "Invalid route airport context" };
    }
    const icao = normalizeAirportIcao(parts[0]);
    if (!icao) return { ok: false, error: "Invalid route airport context" };
    return {
      ok: true,
      channel: `route:${callsign}:airport:${icao}`,
      type: "route",
    };
  }

  if (anchor === "center") {
    if (parts.length !== 2) {
      return { ok: false, error: "Invalid route center context" };
    }
    const lat = toNumber(parts[0]);
    const lon = toNumber(parts[1]);
    if (!isLatitude(lat) || !isLongitude(lon)) {
      return { ok: false, error: "Invalid route center context" };
    }
    const roundedLat = roundToGrid(lat);
    const roundedLon = roundToGrid(lon);
    return {
      ok: true,
      channel: `route:${callsign}:center:${formatNumber(roundedLat)}:${formatNumber(roundedLon)}`,
      type: "route",
    };
  }

  return { ok: false, error: "Invalid route channel context" };
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
  if (type === "aircraft") return normalizeAircraftChannel(value);
  if (type === "callsign") return normalizeCallsignChannel(value);
  if (type === "camera") return normalizeScopedChannel("camera", value);
  if (type === "route") return normalizeRouteChannel(value);
  if (type === "session") return normalizeScopedChannel("session", value);
  if (type === "traffic") return normalizeTrafficChannel(value);
  return { ok: false, error: `Unsupported channel type: ${type}` };
}

function parseTrafficChannel(channel: string): PollingTarget {
  const [, anchor, ...parts] = channel.split(":");
  if (anchor !== "center") throw new Error("Invalid traffic channel anchor");
  const [rawLat, rawLon, rawDist] = parts;
  return {
    kind: "positions",
    lat: Number(rawLat),
    lon: Number(rawLon),
    distNm: clampRangeNm(rawDist),
  };
}

function parseRouteChannel(channel: string): PollingTarget {
  const [, callsign, anchor, ...parts] = channel.split(":");
  if (anchor === "airport") {
    return {
      kind: "route",
      callsign,
      context: { type: "airport", icao: parts[0] },
    };
  }
  if (anchor === "center") {
    return {
      kind: "route",
      callsign,
      context: {
        type: "center",
        lat: Number(parts[0]),
        lon: Number(parts[1]),
      },
    };
  }
  return { kind: "route", callsign };
}

export function buildChannelPollingTarget(
  input: string,
  _params: SubscribeParams = {},
): PollingTarget {
  const normalized = normalizeChannelName(input);
  if (normalized.ok !== true) throw new Error(normalized.error);

  if (normalized.type === "traffic") {
    return parseTrafficChannel(normalized.channel);
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

  if (normalized.type === "route") {
    return parseRouteChannel(normalized.channel);
  }

  throw new Error(`${normalized.type} channel does not have an active polling target`);
}

export function getChannelType(channel: string): RealtimeChannelType {
  const normalized = normalizeChannelName(channel);
  if (normalized.ok !== true) throw new Error(normalized.error);
  return normalized.type;
}

export function getChannelBaseIntervalMs(type: RealtimeChannelType) {
  if (type === "aircraft" || type === "callsign" || type === "traffic") {
    return 3_000;
  }
  if (type === "route") {
    return 30 * 60_000;
  }
  return 15_000;
}
