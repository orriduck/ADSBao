import { ADSBAO_SITE_VERSION } from "./siteMeta.js";

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
      items: ["React 19", "Next 16", "Tailwind CSS v4", "Leaflet"],
    },
    {
      label: "Architecture",
      labelKey: "about.meta.architecture",
      items: [
        "Next.js App Router",
        "Vercel route handlers",
        "Supabase + OurAirports directory",
        "Same-origin aviation proxy",
      ],
    },
    {
      label: "Scope",
      labelKey: "about.meta.scope",
      items: [
        { value: "Maps", valueKey: "about.meta.maps" },
        { value: "Weather", valueKey: "about.meta.weather" },
        { value: "Traffic", valueKey: "about.meta.traffic" },
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
    glyph: "ADS-B",
    titleKey: "about.sources.adsbLol.title",
    title: "adsb.lol Aircraft Feed",
    descriptionKey: "about.sources.adsbLol.description",
    description:
      "Primary crowdsourced ADS-B positions used to render nearby traffic, plus recent flight traces for the selected aircraft.",
    host: "api.adsb.lol",
    href: "https://api.adsb.lol/",
  },
  {
    glyph: "ADS-B",
    titleKey: "about.sources.airplanesLive.title",
    title: "airplanes.live Aircraft Feed",
    descriptionKey: "about.sources.airplanesLive.description",
    description:
      "Peer ADS-B positions feed. On cold start the proxy races both feeds and sticks with whichever responds first; on error it re-races to pick a fresh winner.",
    host: "api.airplanes.live",
    href: "https://airplanes.live/api-guide/",
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
    glyph: "ROUTE",
    titleKey: "about.sources.adsbdb.title",
    title: "adsbdb Callsign Routes",
    descriptionKey: "about.sources.adsbdb.description",
    description:
      "Public callsign → origin/destination lookup. Community-submitted corrections can temporarily override a route for 12 hours.",
    host: "api.adsbdb.com",
    href: "https://www.adsbdb.com/",
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
    titleKey: "about.sources.ourAirports.title",
    title: "OurAirports",
    descriptionKey: "about.sources.ourAirports.description",
    description: "Global airport directory powering search and resolution.",
    host: "ourairports.com",
    href: "https://ourairports.com/data/",
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
    title: "Bilibili Aircraft Footage",
    descriptionKey: "about.sources.brandingVideo.description",
    description:
      "Aircraft branding footage credit: 【视频分享】素材分享——飞机起飞降落 by 霸波奔bo奔波霸.",
    host: "bilibili.com",
    href: "https://www.bilibili.com/video/BV1Aw4m1d7HJ/",
  },
  {
    glyph: "COLOR",
    titleKey: "about.sources.colorReference.title",
    title: "Arknights: Endfield Color Reference",
    descriptionKey: "about.sources.colorReference.description",
    description:
      "Color direction references Arknights: Endfield, credited to Perlica and Zhuang Fangyi.",
    host: "endfield.hypergryph.com",
    href: "https://endfield.hypergryph.com/",
  },
];

export const ABOUT_REPOSITORY = {
  name: "orriduck / ADSBao",
  license: "MIT License",
  licenseKey: "about.mitLicense",
  href: "https://github.com/orriduck/ADSBao",
};
