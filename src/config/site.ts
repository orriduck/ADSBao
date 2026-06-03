export const SITE_NAME = "ADSBao";
const SITE_URL = "https://adsbao.dev";
export const SITE_TITLE = "ADSBao - Airport weather and traffic context";
export const SITE_DESCRIPTION = "Airport context with METAR weather, nearby aircraft, route hints, and map overlays.";
export const SITE_SOCIAL_IMAGE = {
  path: "/opengraph-image",
  type: "image/png",
  width: 1200,
  height: 630,
  alt: SITE_TITLE,
};

export const SITE_KEYWORDS = [
  "ADSBao",
  "airport lookup",
  "METAR",
  "aviation weather",
  "airport map",
  "flight route",
];

export const FEATURED_AIRPORT_CODES = ["KBOS", "KLAX", "KJFK", "KORD", "KSFO", "KSEA"];

export const getSiteUrl = () => new URL(process.env.NEXT_PUBLIC_SITE_URL || SITE_URL);

export const getAbsoluteUrl = (path = "/") => new URL(path, getSiteUrl()).toString();

export const getSocialImageUrl = () => getAbsoluteUrl(SITE_SOCIAL_IMAGE.path);
