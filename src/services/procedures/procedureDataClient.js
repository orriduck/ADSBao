const DEFAULT_COUNTRY = "US";
const DEFAULT_BASE_PATH = "/api/proxy/procedures";

const normalizeAirport = (airport) => String(airport || "").trim().toUpperCase();

export const buildProcedureIndexPath = (
  airport,
  { country = DEFAULT_COUNTRY, basePath = DEFAULT_BASE_PATH } = {},
) => `${basePath}/${country}/${normalizeAirport(airport)}`;

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
    fetchLiveProcedures(airport) {
      return fetchJsonOrNull(
        fetchImpl,
        buildProcedureIndexPath(airport, { country, basePath }),
      );
    },
  };
}

export const procedureDataClient = createProcedureDataClient();
