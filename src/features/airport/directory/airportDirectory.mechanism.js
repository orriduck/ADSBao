import { createAirportPageDataServiceFromEnv } from "./airportPageDataService.js";
import { createOurAirportsQueriesFromEnv } from "../../../app/api/dao/airportDirectory.dao.js";
import { scheduleRefreshIfDue } from "./ourairports/ourAirportsRefresh.js";

import {
  AIRPORT_DIRECTORY_SOURCE,
  AirportDirectoryConfigurationError,
} from "./airportDirectory.models.js";

export const searchAirportDirectory = async ({
  query,
  country,
  type,
  limit,
  queries = createOurAirportsQueriesFromEnv(),
} = {}) => {
  if (!queries) throw new AirportDirectoryConfigurationError();

  const airports = await queries.searchAirports({ query, country, type, limit });
  return {
    airports,
    source: AIRPORT_DIRECTORY_SOURCE,
    query,
    country,
    type,
    limit,
  };
};

export const getAirportDirectoryPage = async ({
  ident,
  radiusNm,
  nearbyLimit,
  service = createAirportPageDataServiceFromEnv(),
} = {}) => {
  if (!service) throw new AirportDirectoryConfigurationError();

  const data = await service.getAirportPageData(ident, {
    radiusNm,
    nearbyLimit,
  });

  if (!data.airport) return null;
  return { ...data, source: AIRPORT_DIRECTORY_SOURCE };
};

export const refreshAirportDirectoryIfDue = (options) =>
  scheduleRefreshIfDue(options);
