const DEFAULT_COUNTRY = "US";
const DEFAULT_BASE_PATH = "/data/procedures";

const normalizeAirport = (airport) => String(airport || "").trim().toUpperCase();

const normalizeProcedureId = (procedureId) =>
  String(procedureId || "").trim().toLowerCase();

export const buildProcedureIndexPath = (
  airport,
  { country = DEFAULT_COUNTRY, basePath = DEFAULT_BASE_PATH } = {},
) => `${basePath}/${country}/${normalizeAirport(airport)}/index.json`;

export const buildProcedureGeoJsonPath = (
  airport,
  procedureId,
  { country = DEFAULT_COUNTRY, basePath = DEFAULT_BASE_PATH } = {},
) =>
  `${basePath}/${country}/${normalizeAirport(airport)}/approaches/${normalizeProcedureId(
    procedureId,
  )}.geojson`;

const fetchJsonOrNull = async (fetchImpl, url) => {
  const response = await fetchImpl(url);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Failed to load procedure data from ${url}: HTTP ${response.status}`);
  }
  return response.json();
};

export function createProcedureDataClient({
  fetchImpl = globalThis.fetch?.bind(globalThis),
  country = DEFAULT_COUNTRY,
  basePath = DEFAULT_BASE_PATH,
} = {}) {
  if (!fetchImpl) throw new Error("Procedure data client requires fetch support");

  return {
    fetchProcedureIndex(airport) {
      return fetchJsonOrNull(
        fetchImpl,
        buildProcedureIndexPath(airport, { country, basePath }),
      );
    },
    fetchProcedureGeoJson(airport, procedureId) {
      return fetchJsonOrNull(
        fetchImpl,
        buildProcedureGeoJsonPath(airport, procedureId, { country, basePath }),
      );
    },
  };
}

export const procedureDataClient = createProcedureDataClient();
