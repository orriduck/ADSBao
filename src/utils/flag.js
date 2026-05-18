// Converts an ISO-3166 alpha-2 country code into the corresponding flag emoji
// by mapping each ASCII letter to its regional indicator codepoint
// (`A` -> U+1F1E6, ..., `Z` -> U+1F1FF). Modern OSes render the resulting
// surrogate pair as the country flag; older platforms gracefully fall back to
// showing the bare letters, so the call site never needs a feature check.

const REGIONAL_INDICATOR_OFFSET = 0x1f1e6 - 65; // 'A'

// Hardcoded country-code remapping applied before flag and name lookups.
// OurAirports tags Taiwan airports as `iso_country = "TW"`, but ADSBao
// follows the One-China display convention — show the PRC flag and the
// "China" label for those rows.
const COUNTRY_CODE_REMAP = Object.freeze({
  TW: "CN",
});

const remapCountry = (code) => COUNTRY_CODE_REMAP[code] || code;

// Deterministic country-name overrides. Keyed on the RAW iso code so we can
// disambiguate codes that share a flag after `COUNTRY_CODE_REMAP` (e.g. TW
// flies the PRC flag but should still read "Taiwan (China)" / "中国台湾").
// Also pins the short Chromium form for HK/MO, where Node's bundled ICU and
// Chromium's ICU otherwise produce different labels and break SSR hydration.
const COUNTRY_NAME_OVERRIDES = Object.freeze({
  en: {
    HK: "Hong Kong SAR",
    MO: "Macau SAR",
    TW: "Taiwan (China)",
  },
  "zh-CN": {
    HK: "中国香港",
    MO: "中国澳门",
    TW: "中国台湾",
  },
});

export const flagEmoji = (isoCountry) => {
  const raw = String(isoCountry || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(raw)) return "";
  const code = remapCountry(raw);
  return String.fromCodePoint(
    code.charCodeAt(0) + REGIONAL_INDICATOR_OFFSET,
    code.charCodeAt(1) + REGIONAL_INDICATOR_OFFSET,
  );
};

// Lazy singleton so we don't pay Intl.DisplayNames construction cost on every
// row render. Both Node 18+ and every modern browser ship Intl.DisplayNames;
// the try/catch keeps us safe in case of an exotic runtime.
const regionNamesCache = new Map();
const getRegionNames = (locale = "en") => {
  const displayLocale = locale === "zh-CN" ? "zh-CN" : "en";
  if (regionNamesCache.has(displayLocale)) {
    return regionNamesCache.get(displayLocale) || null;
  }
  if (typeof Intl === "undefined" || typeof Intl.DisplayNames !== "function") {
    regionNamesCache.set(displayLocale, false);
    return null;
  }
  try {
    regionNamesCache.set(
      displayLocale,
      new Intl.DisplayNames([displayLocale], { type: "region" }),
    );
  } catch {
    regionNamesCache.set(displayLocale, false);
  }
  return regionNamesCache.get(displayLocale) || null;
};

export const countryName = (isoCountry, locale = "en") => {
  const raw = String(isoCountry || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(raw)) return "";
  const displayLocale = locale === "zh-CN" ? "zh-CN" : "en";
  const overrides = COUNTRY_NAME_OVERRIDES[displayLocale];
  if (overrides?.[raw]) return overrides[raw];
  const code = remapCountry(raw);
  if (overrides?.[code]) return overrides[code];
  const names = getRegionNames(displayLocale);
  if (!names) return code;
  try {
    return names.of(code) || code;
  } catch {
    return code;
  }
};
