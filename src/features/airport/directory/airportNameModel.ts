// Decides how an OurAirports override (full, mixed-case name + municipality)
// combines with a normalized OpenAIP airport record. OpenAIP names are
// pre-uppercased and truncated to ~40 chars, so when OurAirports has a name we
// prefer it; otherwise the OpenAIP value (which already falls back to the
// airport code) stands. City is additive: OpenAIP leaves it blank, so we fill
// it from the override without ever clobbering a city OpenAIP did provide.

type AirportRecord = Record<string, any>;
type AirportNameOverride = { name?: string; city?: string } | null | undefined;

export const chooseAirportName = (
  openAipName: unknown,
  ourAirportsName: unknown,
) => {
  const ourAirports = String(ourAirportsName ?? "").trim();
  if (ourAirports) return ourAirports;
  return String(openAipName ?? "").trim();
};

export const applyOurAirportsAirport = <T extends AirportRecord | null | undefined>(
  airport: T,
  override: AirportNameOverride,
): T => {
  if (!airport || !override) return airport;
  const name = chooseAirportName(airport.name, override.name);
  const currentCity = String(airport.city ?? "").trim();
  const overrideCity = String(override.city ?? "").trim();
  const city = currentCity || overrideCity;
  return { ...airport, name, city };
};
