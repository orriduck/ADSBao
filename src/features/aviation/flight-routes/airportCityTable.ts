// Looks up an airport's served city + country from a vendored OurAirports
// table (src/data/airportCities.json, keyed by ICAO → [city, ISO country]).
// Route providers only return airport codes + coordinates, so this resolves
// the human "city, country" label without a DB call or reverse-geocoding the
// runway's coordinates (which lands on the airport's physical township, e.g.
// PHL → "Tinicum Township" instead of "Philadelphia").
//
// The table (~220KB) is loaded once via dynamic import so it ships as its own
// chunk, fetched only when a preview card with a route is first shown.

export type AirportCity = { city: string; countryCode: string };

type AirportCityTable = Record<string, [string, string]>;

let tablePromise: Promise<AirportCityTable> | null = null;

function loadTable(): Promise<AirportCityTable> {
  if (!tablePromise) {
    tablePromise = import("@/data/airportCities.json").then(
      (module) => (module.default ?? module) as AirportCityTable,
    );
  }
  return tablePromise;
}

const normalizeIcao = (icao: unknown) =>
  String(icao || "").trim().toUpperCase();

export async function lookupAirportCity(
  icao: unknown,
): Promise<AirportCity | null> {
  const key = normalizeIcao(icao);
  if (!key) return null;
  const table = await loadTable();
  const entry = table[key];
  if (!entry) return null;
  const [city, countryCode] = entry;
  return { city: city || "", countryCode: countryCode || "" };
}
