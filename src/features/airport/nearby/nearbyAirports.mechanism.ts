import { getOpenAipNearbyAirports } from "../openaip/openAipDirectory";

type NearbyAirportsMechanismRecord = Record<string, any>;

export const getNearbyAirports = async ({
  query,
  client,
}: NearbyAirportsMechanismRecord = {}) => {
  return getOpenAipNearbyAirports({
    query,
    client,
  });
};
