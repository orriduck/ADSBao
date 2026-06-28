import { WEATHER_CODES } from "../../config/weather";

export function getCeilingFeet(metar) {
  const layer = metar?.rawClouds?.find((item) =>
    ["BKN", "OVC", "VV"].includes(item.cover),
  );
  return toNumber(layer?.base);
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
