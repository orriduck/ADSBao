import { ADSBAO_LATEST_CHANGELOG_VERSION } from "./changelog";

const ADSBAO_PRODUCT_NAME = "ADSBao";
// Derive the product version from the most recent changelog entry so a
// release only has to be recorded in one place. The changelog stores
// `v1.13.0` style strings; strip the leading "v" for the user-agent and
// about-page display.
export const ADSBAO_SITE_VERSION = ADSBAO_LATEST_CHANGELOG_VERSION.replace(
  /^v/i,
  "",
);
const ADSBAO_REPOSITORY_URL = "https://github.com/orriduck/ADSBao";

export function buildAdsbaoUserAgent(suffix = "") {
  const base = `${ADSBAO_PRODUCT_NAME}/${ADSBAO_SITE_VERSION} (+${ADSBAO_REPOSITORY_URL})`;
  const cleanSuffix = String(suffix || "").trim();
  return cleanSuffix ? `${base} ${cleanSuffix}` : base;
}
