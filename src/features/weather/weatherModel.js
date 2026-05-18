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

// Each describe* function below now returns an i18n key. The dictionary
// owns the prose so adding zh-CN didn't require duplicating the branch
// logic, and translators can rewrite copy without touching JS.
export function getWeatherConditionKey(code) {
  return WEATHER_CODES[code] ? `weather.code.${code}` : "weather.code.unknown";
}

export function describeWindKey(speed, gust) {
  const effective = Math.max(speed ?? 0, gust ?? 0);
  if (effective >= 30) return "weather.windPara.strong";
  if (effective >= 15) return "weather.windPara.moderate";
  return "weather.windPara.light";
}

export function describeTemperatureKey(temp, spread) {
  if (spread != null && spread < 3) return "weather.tempPara.fogRisk";
  if (temp != null && temp >= 32) return "weather.tempPara.hot";
  if (temp != null && temp <= 0) return "weather.tempPara.cold";
  return "weather.tempPara.normal";
}

export function describePressureKey(altim, pressure) {
  const hpa = pressure ?? (altim != null ? altim * 33.8639 : null);
  if (hpa == null) return "weather.pressurePara.unknown";
  if (hpa < 1000) return "weather.pressurePara.low";
  if (hpa > 1020) return "weather.pressurePara.high";
  return "weather.pressurePara.normal";
}

export function describeCeilingKey(ceilingFt, visibility) {
  if (ceilingFt == null && visibility == null) {
    return "weather.ceilingPara.unknown";
  }
  if (ceilingFt != null && ceilingFt < 1000) return "weather.ceilingPara.low";
  if (visibility != null && visibility < 3)
    return "weather.ceilingPara.reducedVis";
  return "weather.ceilingPara.comfortable";
}

export const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const round1 = (value) => Number(value).toFixed(1);

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
