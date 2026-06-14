export const FLIGHTAWARE_LIVE_FLIGHT_BASE =
  "https://www.flightaware.com/live/flight";
export const MAX_FLIGHTAWARE_HTML_BYTES = 2 * 1024 * 1024;

export type FlightAwareRecord = Record<string, any>;

export function cleanString(value: unknown) {
  return String(value || "").trim();
}

export function normalizeFlightAwareCallsign(value: unknown) {
  const callsign = cleanString(value).toUpperCase().replace(/\s+/g, "");
  return /^[A-Z][A-Z0-9]{2,7}$/.test(callsign) ? callsign : "";
}

export function toNumber(value: unknown) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function htmlDecode(value: unknown) {
  return cleanString(value)
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

export function escapeRegExp(value: unknown) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractMetaContent(html: unknown, key: string) {
  const escaped = escapeRegExp(key);
  const patterns = [
    new RegExp(
      `<meta\\b(?=[^>]*(?:name|property)=["']${escaped}["'])(?=[^>]*content=["']([^"']*)["'])[^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta\\b(?=[^>]*content=["']([^"']*)["'])(?=[^>]*(?:name|property)=["']${escaped}["'])[^>]*>`,
      "i",
    ),
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(String(html || ""));
    if (match?.[1]) return htmlDecode(match[1]);
  }
  return "";
}

export function extractAssignedJson(html: unknown, name: string) {
  const source = String(html || "");
  const marker = `var ${name} =`;
  const start = source.indexOf(marker);
  if (start < 0) return null;
  const objectStart = source.indexOf("{", start + marker.length);
  if (objectStart < 0) return null;

  let depth = 0;
  let escaped = false;
  let inString = false;
  for (let index = objectStart; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(objectStart, index + 1);
    }
  }
  return null;
}

export function parseAssignedJson<T = FlightAwareRecord>(html: unknown, name: string) {
  const jsonText = extractAssignedJson(html, name);
  if (!jsonText) return null;
  try {
    return JSON.parse(jsonText) as T;
  } catch {
    return null;
  }
}

export function buildFlightAwareLiveFlightUrl(callsign: unknown) {
  const normalized = normalizeFlightAwareCallsign(callsign);
  if (!normalized) return "";
  return `${FLIGHTAWARE_LIVE_FLIGHT_BASE}/${encodeURIComponent(normalized)}`;
}

export async function readFlightAwareResponseText(
  response: Response,
  maxBytes = MAX_FLIGHTAWARE_HTML_BYTES,
) {
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    throw new Error("FlightAware response too large");
  }
  return text;
}
