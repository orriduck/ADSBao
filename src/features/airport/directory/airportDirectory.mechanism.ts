import { AIRPORT_DIRECTORY_SOURCE } from "./airportDirectory.models";
import {
  getOpenAipAirportPage,
  searchOpenAipAirports,
} from "../openaip/openAipDirectory";

type AirportDirectoryMechanismRecord = Record<string, any>;

export const searchAirportDirectory = async ({
  query,
  country,
  limit,
  client,
}: AirportDirectoryMechanismRecord = {}) => {
  const airports = await searchOpenAipAirports({ query, country, limit, client });
  return {
    airports,
    source: AIRPORT_DIRECTORY_SOURCE,
    query,
    country,
    limit,
  };
};

export const getAirportDirectoryPage = async ({
  ident,
  radiusNm,
  nearbyLimit,
  client,
}: AirportDirectoryMechanismRecord = {}) => {
  const data = await getOpenAipAirportPage({
    ident,
    radiusNm,
    nearbyLimit,
    client,
  });

  if (!data?.airport) return null;
  return { ...data, source: AIRPORT_DIRECTORY_SOURCE };
};
