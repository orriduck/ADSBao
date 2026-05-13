export const ABOUT_BUILD_META = [
  { label: "Version", value: "0.9.0" },
  { label: "Release", value: "Next.js Web" },
  { label: "Stack", value: "React 19 · Next 16 · Leaflet" },
  { label: "Scope", value: "Maps · Weather · Traffic" },
];

export const ABOUT_DATA_SOURCES = [
  {
    glyph: "METAR",
    title: "Aviation Weather METAR",
    description:
      "Live observations and decoded sky conditions for each airport.",
    host: "aviationweather.gov",
    href: "https://aviationweather.gov/data/api/",
  },
  {
    glyph: "ADS-B",
    title: "adsb.lol Aircraft Feed",
    description: "Crowdsourced ADS-B positions used to render nearby traffic.",
    host: "api.adsb.lol",
    href: "https://api.adsb.lol/",
  },
  {
    glyph: "ICONS",
    title: "AircraftShapesSVG",
    description:
      "Top-view aircraft silhouettes on the map. Icons by RexKramer1, licensed GPL-3.0, used with attribution.",
    host: "github.com/RexKramer1",
    href: "https://github.com/RexKramer1/AircraftShapesSVG",
  },
  {
    glyph: "ROUTE",
    title: "VRS Standing-Data Routes",
    description:
      "Callsign route references inferred from standing data, not official live flight plans.",
    host: "vrs-standing-data.adsb.lol",
    href: "https://vrs-standing-data.adsb.lol/",
  },
  {
    glyph: "WX",
    title: "Open-Meteo Current Weather",
    description:
      "Local temperature, wind, and conditions for the airport area.",
    host: "open-meteo.com",
    href: "https://open-meteo.com/",
  },
  {
    glyph: "DIR",
    title: "OurAirports",
    description: "Global airport directory powering search and resolution.",
    host: "ourairports.com",
    href: "https://ourairports.com/data/",
  },
  {
    glyph: "WIKI",
    title: "Wikipedia Summary",
    description: "First-paragraph summaries for airport context cards.",
    host: "en.wikipedia.org",
    href: "https://en.wikipedia.org/api/rest_v1/",
  },
  {
    glyph: "MAP",
    title: "OpenStreetMap · CartoDB",
    description: "Light and dark base map tiles plus reference labels.",
    host: "cartocdn.com",
    href: "https://carto.com/attributions",
  },
];

export const ABOUT_REPOSITORY = {
  name: "orriduck / ADSBao",
  license: "MIT License",
  href: "https://github.com/orriduck/ADSBao",
};
