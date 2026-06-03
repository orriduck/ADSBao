import { WEATHER_CODES } from "../../config/weather";

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

// Token row above the raw METAR string: pulls station / issued / wind /
// visibility tokens out so the row reads at-a-glance. Labels are i18n
// keys; the renderer maps them through t().
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
    { labelKey: "weather.metarToken.station", value: station || "-" },
    { labelKey: "weather.metarToken.issued", value: issued || "-" },
    { labelKey: "weather.metarToken.wind", value: wind || "-" },
    { labelKey: "weather.metarToken.vis", value: visibility || "-" },
  ];
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
