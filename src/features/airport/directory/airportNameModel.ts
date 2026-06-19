// Airport display names come only from the OurAirports table. OpenAIP still
// supplies discovery geometry and metadata, but its airport `name` field is
// intentionally ignored so truncated OpenAIP names cannot leak into the UI.

type AirportRecord = Record<string, any>;
type AirportNameOverride = { name?: string; city?: string } | null | undefined;

export const chooseAirportName = (
  _openAipName: unknown,
  ourAirportsName: unknown,
) => {
  const ourAirports = String(ourAirportsName ?? "").trim();
  return ourAirports;
};

export const applyOurAirportsAirport = <T extends AirportRecord | null | undefined>(
  airport: T,
  override: AirportNameOverride,
): T => {
  if (!airport) return airport;
  const name = chooseAirportName(airport.name, override?.name);
  const currentCity = String(airport.city ?? "").trim();
  const overrideCity = String(override?.city ?? "").trim();
  const city = currentCity || overrideCity;
  return { ...airport, name, city };
};
