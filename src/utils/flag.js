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
let regionNamesCache = null;
const getRegionNames = () => {
  if (regionNamesCache !== null) return regionNamesCache || null;
  if (typeof Intl === "undefined" || typeof Intl.DisplayNames !== "function") {
    regionNamesCache = false;
    return null;
  }
  try {
    regionNamesCache = new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    regionNamesCache = false;
  }
  return regionNamesCache || null;
};

export const countryName = (isoCountry) => {
  const raw = String(isoCountry || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(raw)) return "";
  const code = remapCountry(raw);
  const names = getRegionNames();
  if (!names) return code;
  try {
    return names.of(code) || code;
  } catch {
    return code;
  }
};
