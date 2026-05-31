const DEFAULT_BASE_PATH = "/api/proxy/airports/nearby";

type NearbyAirportClientRecord = Record<string, any>;

const setOptionalParam = (url: URL, key: string, value: unknown) => {
  if (value == null || value === "") return;
  url.searchParams.set(key, String(value));
};

export function buildNearbyAirportsPath({
  lat,
  lon,
  icao = "",
  radiusNm,
  limit,
  basePath = DEFAULT_BASE_PATH,
}: NearbyAirportClientRecord = {}) {
  const url = new URL(basePath, "http://localhost");
  setOptionalParam(url, "lat", lat);
  setOptionalParam(url, "lon", lon);
  setOptionalParam(url, "icao", String(icao || "").trim().toUpperCase());
  setOptionalParam(url, "radiusNm", radiusNm);
  setOptionalParam(url, "limit", limit);
  return `${url.pathname}${url.search}`;
}

export function createNearbyAirportClient({
  fetchImpl = globalThis.fetch?.bind(globalThis),
  basePath = DEFAULT_BASE_PATH,
}: NearbyAirportClientRecord = {}) {
  if (!fetchImpl) throw new Error("Nearby airport client requires fetch support");

  return {
    async fetchNearbyAirports(options: NearbyAirportClientRecord = {}) {
      const url = buildNearbyAirportsPath({ ...options, basePath });
      const response = await fetchImpl(url, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (response.status === 404) return { airports: [] };
      if (!response.ok) {
        throw new Error(`Failed to load nearby airports: HTTP ${response.status}`);
      }
      return response.json();
    },
  };
}

export const nearbyAirportClient = createNearbyAirportClient();
