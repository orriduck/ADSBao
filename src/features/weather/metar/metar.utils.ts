export function buildMetarUrl(icao) {
  const url = new URL("https://aviationweather.gov/api/data/metar");
  url.searchParams.set("ids", icao);
  url.searchParams.set("format", "json");
  return url;
}
