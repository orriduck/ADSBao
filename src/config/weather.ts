// Locale-aware labels and context blurbs are resolved through i18n at
// render time (see WeatherSlides.FlightRulesSlide). The hardcoded English
// strings below stay as the en-locale fallback so a missing translation
// still produces a sensible UI in production.
export const FLIGHT_RULES = {
  VFR: {
    labelKey: "weather.flightRules.vfr.label",
    contextKey: "weather.flightRules.vfr.context",
    label: "Visual Flight Rules",
    color: "var(--atc-text)",
    context:
      "Skies and visibility support normal visual operations. Weather is unlikely to constrain airport capacity.",
  },
  MVFR: {
    labelKey: "weather.flightRules.mvfr.label",
    contextKey: "weather.flightRules.mvfr.context",
    label: "Marginal Visual Flight Rules",
    color: "var(--atc-dim)",
    context:
      "Visibility or ceiling is reduced. Arrivals and departures usually continue, but pilots watch weather margins closely.",
  },
  IFR: {
    labelKey: "weather.flightRules.ifr.label",
    contextKey: "weather.flightRules.ifr.context",
    label: "Instrument Flight Rules",
    color: "var(--atc-faint)",
    context:
      "Low clouds or limited visibility require instrument procedures. Arrival spacing can increase and delays become more likely.",
  },
  LIFR: {
    labelKey: "weather.flightRules.lifr.label",
    contextKey: "weather.flightRules.lifr.context",
    label: "Low IFR",
    color: "var(--atc-line-strong)",
    context:
      "Very low ceiling or visibility limits airport flow. Only aircraft and runways equipped for low-visibility operations can land reliably.",
  },
};

export const FLIGHT_RULE_ORDER = ["VFR", "MVFR", "IFR", "LIFR"];

export const WEATHER_CODES = {
  0: "Clear",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy showers",
  95: "Thunderstorm",
};

