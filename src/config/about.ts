import { ADSBAO_SITE_VERSION } from "./siteMeta";

export const ABOUT_BUILD_META = {
  version: {
    label: "Version",
    labelKey: "about.meta.version",
    value: ADSBAO_SITE_VERSION,
  },
  sections: [
    {
      label: "Stack",
      labelKey: "about.meta.stack",
      layout: "compact-grid",
      items: [
        "React 19",
        "Vite 8",
        "Tailwind CSS v4",
        "MapLibre GL",
        "Leaflet",
        "Three.js",
      ],
    },
    {
      label: "Architecture",
      labelKey: "about.meta.architecture",
      items: [
        "Railway Go service",
        "Vite static frontend",
        "OpenAIP + Railway Postgres",
        "Same-origin aviation proxy",
      ],
    },
  ],
};

export const ABOUT_DATA_SOURCES = [
  {
    glyph: "METAR",
    titleKey: "about.sources.aviationWeather.title",
    title: "Aviation Weather METAR",
    descriptionKey: "about.sources.aviationWeather.description",
    description:
      "Live observations and decoded sky conditions for each airport.",
    host: "aviationweather.gov",
    href: "https://aviationweather.gov/data/api/",
  },
  {
    glyph: "ICONS",
    titleKey: "about.sources.aircraftShapes.title",
    title: "AircraftShapesSVG",
    descriptionKey: "about.sources.aircraftShapes.description",
    description:
      "Top-view aircraft silhouettes on the map. Icons by RexKramer1, licensed GPL-3.0, used with attribution.",
    host: "github.com/RexKramer1",
    href: "https://github.com/RexKramer1/AircraftShapesSVG",
  },
  {
    glyph: "WX",
    titleKey: "about.sources.openMeteo.title",
    title: "Open-Meteo Current Weather",
    descriptionKey: "about.sources.openMeteo.description",
    description:
      "Local temperature, wind, and conditions for the airport area.",
    host: "open-meteo.com",
    href: "https://open-meteo.com/",
  },
  {
    glyph: "DIR",
    titleKey: "about.sources.openAip.title",
    title: "OpenAIP",
    descriptionKey: "about.sources.openAip.description",
    description:
      "Airport, runway, frequency, navaid, airspace, reporting point, and obstacle context used by search and maps. Licensed CC BY-NC 4.0.",
    host: "openaip.net",
    href: "https://creativecommons.org/licenses/by-nc/4.0/",
  },
  {
    glyph: "RWY",
    titleKey: "about.sources.ourAirportsRunways.title",
    title: "OurAirports Static Facilities",
    descriptionKey: "about.sources.ourAirportsRunways.description",
    description:
      "Runway threshold coordinates plus ATC frequency and navaid augmentation data.",
    host: "ourairports.com",
    href: "https://ourairports.com/data/",
  },
  {
    glyph: "SPOT",
    titleKey: "about.sources.spotterGuide.title",
    title: "spotterguide.net",
    descriptionKey: "about.sources.spotterGuide.description",
    description:
      "Some curated public photo location data for Watcher Mode comes from airport guides on spotterguide.net.",
    host: "spotterguide.net",
    href: "https://www.spotterguide.net/",
  },
  {
    glyph: "WIKI",
    titleKey: "about.sources.wikipedia.title",
    title: "Wikipedia Summary",
    descriptionKey: "about.sources.wikipedia.description",
    description: "First-paragraph summaries for airport context cards.",
    host: "en.wikipedia.org",
    href: "https://en.wikipedia.org/api/rest_v1/",
  },
  {
    glyph: "MAP",
    titleKey: "about.sources.mapTiles.title",
    title: "OpenStreetMap · CartoDB",
    descriptionKey: "about.sources.mapTiles.description",
    description: "Light and dark base map tiles plus reference labels.",
    host: "cartocdn.com",
    href: "https://carto.com/attributions",
  },
  {
    glyph: "VIDEO",
    titleKey: "about.sources.brandingVideo.title",
    title: "Mixkit Stock Video",
    descriptionKey: "about.sources.brandingVideo.description",
    description:
      "Aircraft branding footage processed from Mixkit airport and airplane stock video clips under the Mixkit Stock Video Free License.",
    host: "mixkit.co",
    href: "https://mixkit.co/free-stock-video/",
  },
];

export const ABOUT_REPOSITORY = {
  name: "orriduck / ADSBao",
  license: "MIT License",
  licenseKey: "about.mitLicense",
  href: "https://github.com/orriduck/ADSBao",
};
