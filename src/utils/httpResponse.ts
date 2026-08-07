const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

type ReadOptions = { label?: string; maxBytes?: number };

export function normalizeLatitude(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= -90 && number <= 90 ? number : null;
}

export function normalizeLongitude(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= -180 && number <= 180 ? number : null;
}

export function normalizeDistanceNm(value: unknown, { min = 1, max = 250 }: {
  min?: number; max?: number;
} = {}) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

export function normalizeAircraftHex(value: unknown) {
  const hex = String(value || "").trim().toUpperCase();
  return /^(~?[0-9A-F]{6})$/.test(hex) ? hex : "";
}

export async function readResponseText(response: Response, {
  label = "service response",
  maxBytes = DEFAULT_MAX_RESPONSE_BYTES,
}: ReadOptions = {}) {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error(`${label} exceeded ${maxBytes} bytes`);
  }
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new Error(`${label} exceeded ${maxBytes} bytes`);
  }
  return text;
}

export async function readResponseJson(response: Response, options: ReadOptions = {}) {
  const text = await readResponseText(response, options);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON from ${options.label || "service response"}`);
  }
}
