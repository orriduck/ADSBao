import { countryName, flagEmoji } from "./flag.js";

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

export const airportDisplayName = (airport, locale = "en") => {
  const fallback = airport?.name || airport?.icao || airport?.iata || "";
  if (locale !== "zh-CN") return fallback;
  const localizedName = String(airport?.localizedName || "").trim();
  if (localizedName) return localizedName;
  const icao = String(airport?.icao || airport?.code || "").toUpperCase();
  return AIRPORT_NAME_ZH[icao] || fallback;
};

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
