export const FLIGHT_RULES = {
  VFR: {
    label: "Visual Flight Rules",
    color: "var(--atc-text)",
    context:
      "Skies and visibility support normal visual operations. Weather is unlikely to constrain airport capacity.",
  },
  MVFR: {
    label: "Marginal Visual Flight Rules",
    color: "var(--atc-dim)",
    context:
      "Visibility or ceiling is reduced. Arrivals and departures usually continue, but pilots watch weather margins closely.",
  },
  IFR: {
    label: "Instrument Flight Rules",
    color: "var(--atc-faint)",
    context:
      "Low clouds or limited visibility require instrument procedures. Arrival spacing can increase and delays become more likely.",
  },
  LIFR: {
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

export const WEATHER_SLIDE_COPY = {
  panel: {
    metar: {
      label: "METAR",
      title: "METAR report",
      eyebrow: "METAR / Weather",
    },
    rules: {
      label: "Rules",
      title: "Flight rules",
      eyebrow: "Operational context",
    },
    ceiling: {
      label: "Ceiling",
      title: "Ceiling / visibility",
      eyebrow: "Cloud deck",
    },
    wind: {
      label: "Wind",
      title: "Wind speed",
      eyebrow: "Surface flow",
    },
    temp: {
      label: "Temp",
      title: "Temp / dew",
      eyebrow: "Thermal spread",
    },
    pressure: {
      label: "Pressure",
      title: "Pressure",
      eyebrow: "Altimeter",
    },
    local: {
      label: "Local",
      title: "Local weather",
      eyebrow: "Open-Meteo",
    },
  },
  carousel: {
    metar: { label: "METAR", navLabel: "METAR", title: "Raw METAR" },
    rules: { label: "Rules", navLabel: "RULE", title: "Flight rules" },
    ceiling: {
      label: "Ceiling",
      navLabel: "C/V",
      title: "Ceiling / visibility",
    },
    wind: { label: "Wind", navLabel: "WIND", title: "Wind" },
    temp: { label: "Temp", navLabel: "TEMP", title: "Temperature" },
    pressure: { label: "Pressure", navLabel: "ALT", title: "Altimeter" },
    local: { label: "Local", navLabel: "LOCAL", title: "Local conditions" },
  },
};
