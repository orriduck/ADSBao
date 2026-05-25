export const ADSBAO_PRODUCT_NAME = "ADSBao";
export const ADSBAO_SITE_VERSION = "1.5.0";
export const ADSBAO_REPOSITORY_URL = "https://github.com/orriduck/ADSBao";

export function buildAdsbaoUserAgent(suffix = "") {
  const base = `${ADSBAO_PRODUCT_NAME}/${ADSBAO_SITE_VERSION} (+${ADSBAO_REPOSITORY_URL})`;
  const cleanSuffix = String(suffix || "").trim();
  return cleanSuffix ? `${base} ${cleanSuffix}` : base;
}
