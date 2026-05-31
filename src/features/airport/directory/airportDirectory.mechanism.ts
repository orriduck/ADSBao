import { createAirportPageDataServiceFromEnv } from "./airportPageDataService";
import { createOurAirportsQueriesFromEnv } from "../../../app/api/dao/airportDirectory.dao";
import { scheduleRefreshIfDue } from "./ourairports/ourAirportsRefresh";

import {
  AIRPORT_DIRECTORY_SOURCE,
  AirportDirectoryConfigurationError,
} from "./airportDirectory.models";

type AirportDirectoryMechanismRecord = Record<string, any>;

export const searchAirportDirectory = async ({
  query,
  country,
  type,
  limit,
  queries = createOurAirportsQueriesFromEnv(),
}: AirportDirectoryMechanismRecord = {}) => {
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
}: AirportDirectoryMechanismRecord = {}) => {
  if (!service) throw new AirportDirectoryConfigurationError();

  const data = await service.getAirportPageData(ident, {
    radiusNm,
    nearbyLimit,
  });

  if (!data.airport) return null;
  return { ...data, source: AIRPORT_DIRECTORY_SOURCE };
};

export const refreshAirportDirectoryIfDue = (options: AirportDirectoryMechanismRecord = {}) =>
  scheduleRefreshIfDue(options);
