import { WEATHER_CODES } from "../../config/weather.js";

export function getCeilingFeet(metar) {
  const layer = metar?.rawClouds?.find((item) =>
    ["BKN", "OVC", "VV"].includes(item.cover),
  );
  return toNumber(layer?.base);
}

export function shouldShowCeilingSlide(metar) {
  const ceilingFt = getCeilingFeet(metar);
  const hasVisibility =
    metar?.rawVisib != null && Number.isFinite(Number(metar.rawVisib));
  return ceilingFt != null || hasVisibility;
}

export function formatObsTime(value) {
  if (!value) return "latest";
  const date = new Date(
    Number(value) < 10_000_000_000 ? Number(value) * 1000 : value,
  );
  if (Number.isNaN(date.getTime())) return "latest";
  return date.toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getWeatherConditionLabel(code) {
  return WEATHER_CODES[code] || "Current conditions";
}

export function getMetarTokens(raw) {
  const parts = String(raw || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return [];
  const reportPrefix = /^(METAR|SPECI)$/i.test(parts[0]);
  const station = reportPrefix ? parts[1] : parts[0];
  const issued = reportPrefix ? parts[2] : parts[1];

  const wind = parts.find((item) =>
    /^(VRB|\d{3})\d{2,3}(G\d{2,3})?KT$/.test(item),
  );
  const visibility = parts.find((item) =>
    /^(\d{1,2}|\d{1,2}SM|P\d{1,2}SM|\d\/\dSM)$/.test(item),
  );

  return [
    { label: "Station", value: station || "-" },
    { label: "Issued", value: issued || "-" },
    { label: "Wind", value: wind || "-" },
    { label: "Vis", value: visibility || "-" },
  ];
}

export function describeWind(speed, gust) {
  const effective = Math.max(speed ?? 0, gust ?? 0);
  if (effective >= 30) {
    return "Strong winds or gusts can reduce arrival rates, increase go-around risk, and force stricter runway selection.";
  }
  if (effective >= 15) {
    return "Moderate wind is workable, but crosswind components and gust spread can affect spacing and runway configuration.";
  }
  return "Light wind usually gives the airport more runway flexibility and keeps arrival and departure flow stable.";
}

export function describeTemperature(temp, spread) {
  if (spread != null && spread < 3) {
    return "A small temperature-dewpoint spread can support fog, haze, or low cloud development near the field.";
  }
  if (temp != null && temp >= 32) {
    return "Hot air reduces aircraft performance, which can lengthen takeoff rolls and affect climb margins.";
  }
  if (temp != null && temp <= 0) {
    return "Cold conditions can improve density altitude, but icing, braking action, and deicing become operational concerns.";
  }
  return "Temperature and dewpoint are separated enough that fog risk is lower near the field.";
}

export function describePressure(altim, pressure) {
  const hpa = pressure ?? (altim != null ? altim * 33.8639 : null);
  if (hpa == null) {
    return "Pressure data helps crews set altimeters and judge density-altitude effects around the airport.";
  }
  if (hpa < 1000) {
    return "Lower pressure increases density altitude and can come with unsettled weather, reducing performance margins.";
  }
  if (hpa > 1020) {
    return "Higher pressure generally improves aircraft performance and often accompanies more stable weather.";
  }
  return "Pressure is near standard range, so altimeter setting is important but not a major performance driver.";
}

export function describeCeiling(ceilingFt, visibility) {
  if (ceilingFt == null && visibility == null) {
    return "No limiting ceiling or visibility value is available in the current METAR.";
  }
  if (ceilingFt != null && ceilingFt < 1000) {
    return "Low ceiling can push arrivals toward instrument procedures and reduce visual runway flexibility.";
  }
  if (visibility != null && visibility < 3) {
    return "Reduced visibility can increase spacing and make surface movement more dependent on tower guidance.";
  }
  return "Ceiling and visibility are comfortably above the usual VFR thresholds for airport operations.";
}

export const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const round1 = (value) => Number(value).toFixed(1);

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
