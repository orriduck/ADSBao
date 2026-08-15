import { countryName, flagEmoji } from "./flag";

const INVALID_AIRPORT_CODE_VALUES = new Set([
  "NIL",
  "<NIL>",
  "NULL",
  "<NULL>",
  "NONE",
  "N/A",
  "\\N",
]);

const AIRPORT_NAME_ZH = Object.freeze({
  KJFK: "约翰·F·肯尼迪国际机场",
  KLAX: "洛杉矶国际机场",
  KORD: "芝加哥奥黑尔国际机场",
  KATL: "哈茨菲尔德-杰克逊亚特兰大国际机场",
  KBOS: "波士顿洛根国际机场",
  CYYZ: "多伦多皮尔逊国际机场",
  EGLL: "伦敦希思罗机场",
  LFPG: "巴黎夏尔·戴高乐机场",
  EDDF: "法兰克福机场",
  VHHH: "香港国际机场",
  RKSI: "仁川国际机场",
  KSFO: "旧金山国际机场",
  KSEA: "西雅图-塔科马国际机场",
  EHAM: "阿姆斯特丹史基浦机场",
  KIAD: "华盛顿杜勒斯国际机场",
  SCEL: "阿图罗·梅里诺·贝尼特斯国际机场",
  VTBS: "素万那普机场",
  KMEM: "孟菲斯国际机场",
  PANC: "泰德·史蒂文斯安克雷奇国际机场",
  KSDF: "路易维尔穆罕默德·阿里国际机场",
});

const CITY_NAME_ZH = Object.freeze({
  "New York": "纽约",
  "Los Angeles": "洛杉矶",
  Chicago: "芝加哥",
  Atlanta: "亚特兰大",
  Boston: "波士顿",
  Toronto: "多伦多",
  London: "伦敦",
  Paris: "巴黎",
  "Frankfurt am Main": "法兰克福",
  "Hong Kong": "香港",
  Seoul: "首尔",
  "San Francisco": "旧金山",
  Seattle: "西雅图",
  Amsterdam: "阿姆斯特丹",
  Washington: "华盛顿",
  Santiago: "圣地亚哥",
  Bangkok: "曼谷",
  Memphis: "孟菲斯",
  Anchorage: "安克雷奇",
  Louisville: "路易维尔",
});

export const cleanAirportCode = (value: unknown) => {
  const code = String(value ?? "").trim().toUpperCase();
  if (!code || INVALID_AIRPORT_CODE_VALUES.has(code)) return "";
  return code;
};

export const airportDisplayName = (airport, locale = "en") => {
  const fallback =
    airport?.name ||
    cleanAirportCode(airport?.iata) ||
    cleanAirportCode(airport?.icao) ||
    cleanAirportCode(airport?.code) ||
    "";
  if (locale !== "zh-CN") return fallback;
  const localizedName = String(airport?.localizedName || "").trim();
  if (localizedName) return localizedName;
  const icao = cleanAirportCode(airport?.icao) || cleanAirportCode(airport?.code);
  return AIRPORT_NAME_ZH[icao] || fallback;
};

// Public-facing airport code. IATA is the three-letter code travellers
// expect (JFK, LHR), so it leads everywhere in the UI; ICAO and local
// identifiers are fallbacks for airports that have no IATA code.
export const airportDisplayCode = (airport: Record<string, any> = {}) =>
  cleanAirportCode(airport?.iata) ||
  cleanAirportCode(airport?.icao) ||
  cleanAirportCode(airport?.code) ||
  cleanAirportCode(airport?.localCode) ||
  cleanAirportCode(airport?.ident);

// Kept as an alias so directory/search call sites read as directory intent
// while sharing the same IATA-first display rule as every other surface.
export const airportDirectoryCode = (airport: Record<string, any> = {}) =>
  airportDisplayCode(airport);

// Single-line code display (IATA-first, ICAO/local fallback). Older call
// sites used this name to render "IATA · ICAO"; it now returns only the
// display code so the UI stays consistently three-letter when IATA exists.
export const airportDisplayCodeLine = (airport: Record<string, any> = {}) =>
  airportDisplayCode(airport) || "—";

export const airportCityName = (city, locale = "en") => {
  const fallback = String(city || "");
  if (locale !== "zh-CN") return fallback;
  return CITY_NAME_ZH[fallback] || fallback;
};

export const airportSubtitle = (airport, locale = "en") => {
  const flag = flagEmoji(airport?.country);
  const country = countryName(airport?.country, locale) || airport?.country || "";
  const city = airportCityName(airport?.city, locale);
  const place =
    city && country
      ? `${city} · ${country}`
      : city || country || airport?.type_label || airport?.type || "Airport";
  return flag ? `${flag} ${place}` : place;
};
