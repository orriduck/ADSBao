// Service-layer aggregation for an airport detail page. Pulls airport,
// runways, frequencies, nearby airports, and nearby navaids out of the
// OurAirports query layer in parallel and returns one domain object. Contains
// orchestration only — raw database access lives in queries.js.

import {
  createOurAirportsQueries,
  createOurAirportsQueriesFromEnv,
} from "../../../app/api/dao/airportDirectory.dao";

const DEFAULT_NEARBY_RADIUS_NM = 60;
const DEFAULT_NEARBY_LIMIT = 12;

const settledValue = (result, fallback) => {
  if (result.status === "fulfilled") return result.value;
  console.warn("[airportPageDataService] sub-query failed:", result.reason);
  return fallback;
};

export const createAirportPageDataService = ({ queries }) => {
  if (!queries) {
    throw new Error("airportPageDataService requires a queries instance");
  }

  return {
    async getAirportPageData(ident, options = {}) {
      const trimmed = String(ident ?? "").trim();
      if (!trimmed) {
        return {
          airport: null,
          runways: [],
          frequencies: [],
          nearbyAirports: [],
          nearbyNavaids: [],
        };
      }

      const airport = await queries.getAirportByIdent(trimmed);
      if (!airport) {
        return {
          airport: null,
          runways: [],
          frequencies: [],
          nearbyAirports: [],
          nearbyNavaids: [],
        };
      }

      const radiusNm = options.radiusNm ?? DEFAULT_NEARBY_RADIUS_NM;
      const nearbyLimit = options.nearbyLimit ?? DEFAULT_NEARBY_LIMIT;

      const results = await Promise.allSettled([
        queries.getRunwaysByAirport(airport.ident),
        queries.getFrequenciesByAirport(airport.ident),
        queries.getNearbyAirports({ ident: airport.ident, radiusNm, limit: nearbyLimit }),
        queries.getNearbyNavaids({ ident: airport.ident, radiusNm, limit: nearbyLimit }),
      ]);

      return {
        airport,
        runways: settledValue(results[0], []),
        frequencies: settledValue(results[1], []),
        nearbyAirports: settledValue(results[2], []),
        nearbyNavaids: settledValue(results[3], []),
      };
    },
  };
};

export const createAirportPageDataServiceFromEnv = ({ env = process.env } = {}) => {
  const queries = createOurAirportsQueriesFromEnv({ env });
  if (!queries) return null;
  return createAirportPageDataService({ queries });
};

export const createAirportPageDataServiceFromQueries = (queries) =>
  createAirportPageDataService({ queries: createOurAirportsQueries({ client: queries }) });
