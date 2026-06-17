const DEFAULT_BASE_PATH = "/api/proxy/airports/nearby";

type NearbyAirportClientRecord = Record<string, any>;

const setOptionalParam = (url: URL, key: string, value: unknown) => {
  if (value == null || value === "") return;
  url.searchParams.set(key, String(value));
};

function buildNearbyAirportsPath({
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

function createNearbyAirportClient({
  fetchImpl = globalThis.fetch?.bind(globalThis),
  basePath = DEFAULT_BASE_PATH,
}: NearbyAirportClientRecord = {}) {
  if (!fetchImpl) throw new Error("Nearby airport client requires fetch support");
  const inFlight = new Map<string, Promise<any>>();

  return {
    async fetchNearbyAirports(options: NearbyAirportClientRecord = {}) {
      const url = buildNearbyAirportsPath({ ...options, basePath });
      const pending = inFlight.get(url);
      if (pending) return pending;
      const promise = fetchImpl(url, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      })
        .then((response) => {
          if (response.status === 404) return { airports: [] };
          if (!response.ok) {
            throw new Error(`Failed to load nearby airports: HTTP ${response.status}`);
          }
          return response.json();
        })
        .finally(() => {
          inFlight.delete(url);
        });
      inFlight.set(url, promise);
      return promise;
    },
  };
}

export const nearbyAirportClient = createNearbyAirportClient();
