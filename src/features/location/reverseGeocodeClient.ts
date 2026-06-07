// Reverse-geocodes a lat/lon to city / state / country labels using
// OpenStreetMap's Nominatim service. Nominatim is free, CORS-friendly
// (it ships `access-control-allow-origin: *`), and respects the
// browser's Origin header for usage attribution.
//
// Results are cached in-memory keyed by rounded lat/lon so a single
// session never re-hits the API for the same coords (Nominatim's
// usage policy caps clients at 1 req/sec; the cache plus the
// geolocation jitter floor keep us well under that).

type NominatimAddress = {
  city?: unknown;
  town?: unknown;
  village?: unknown;
  hamlet?: unknown;
  municipality?: unknown;
  borough?: unknown;
  county?: unknown;
  district?: unknown;
  state_district?: unknown;
  state?: unknown;
  region?: unknown;
  country?: unknown;
  country_code?: unknown;
};

type NominatimResponse = {
  address?: NominatimAddress;
};

export type ReverseGeocodeResult = {
  // Most specific human-friendly place name available — city, then a
  // town/village/borough fallback for non-urban locations.
  city: string;
  // County / district level above the city (US: "Suffolk County",
  // UK: a district, etc.). Empty when the response doesn't list one.
  county: string;
  // First-level subdivision: US state, Chinese province, etc.
  state: string;
  // Localized country name + ISO-3166 alpha-2 country code (uppercase).
  countryName: string;
  countryCode: string;
};

const CACHE = new Map<string, ReverseGeocodeResult>();
// Same-origin proxy in front of Nominatim so we don't have to relax
// the app's CSP `connect-src` and the upstream sees our application
// User-Agent (set inside the proxy route).
const ENDPOINT = "/api/proxy/reverse-geocode";

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function firstNonEmpty(...values: Array<unknown>) {
  for (const value of values) {
    const text = normalizeString(value);
    if (text) return text;
  }
  return "";
}

function cacheKey(lat: number, lon: number, language: string) {
  // ~1km resolution is plenty for "what city am I in" — and the GPS
  // jitter floor would otherwise re-issue this request constantly.
  return `${lat.toFixed(2)}:${lon.toFixed(2)}:${language}`;
}

// `accept-language` can be a comma-delimited preference list; we pass
// the user's UI locale first so localizable fields (city / state /
// country) come back in their language when Nominatim has translated
// names, with English as the fallback.
//
// Chinese is special: OSM stores multiple Chinese variants (`name:zh-Hans`,
// `name:zh-Hant`, plain `name:zh`, sometimes `name:zh-CN` / `name:zh-TW`).
// Plain `zh-CN` in accept-language tends to fall through to whichever
// `name:zh` happens to be tagged — which on the mainland is a mix of
// simplified and traditional. Explicitly preferring `zh-Hans` (for
// zh-CN) or `zh-Hant` (for zh-TW) before the regional tag keeps the
// rendered place names consistent with the user's chosen locale.
function buildAcceptLanguage(language: string) {
  const primary = normalizeString(language).toLowerCase();
  if (!primary || primary === "en") return "en";
  if (primary === "zh-cn" || primary === "zh-hans") {
    return "zh-Hans,zh-CN,zh,en";
  }
  if (primary === "zh-tw" || primary === "zh-hant") {
    return "zh-Hant,zh-TW,zh,en";
  }
  if (primary === "zh-hk") {
    return "zh-Hant,zh-HK,zh,en";
  }
  return `${primary},en`;
}

export async function fetchReverseGeocode(
  lat: number,
  lon: number,
  language = "en",
): Promise<ReverseGeocodeResult | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const key = cacheKey(lat, lon, language);
  if (CACHE.has(key)) return CACHE.get(key) || null;

  const url =
    `${ENDPOINT}?lat=${lat}&lon=${lon}` +
    `&language=${encodeURIComponent(buildAcceptLanguage(language))}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`reverse-geocode HTTP ${response.status}`);
  const json = (await response.json()) as NominatimResponse;
  const address = json?.address || {};

  const result: ReverseGeocodeResult = {
    // City fallback chain — Nominatim populates the most specific
    // bucket the OSM relation provided. Urban points usually fill
    // `city`; rural points fill `town` / `village` / `hamlet`.
    city: firstNonEmpty(
      address.city,
      address.town,
      address.village,
      address.borough,
      address.hamlet,
      address.municipality,
    ),
    county: firstNonEmpty(
      address.county,
      address.district,
      address.state_district,
    ),
    state: firstNonEmpty(address.state, address.region),
    countryName: normalizeString(address.country),
    countryCode: normalizeString(address.country_code).toUpperCase(),
  };

  CACHE.set(key, result);
  return result;
}
