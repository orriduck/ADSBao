// Converts an ISO-3166 alpha-2 country code into the corresponding flag emoji
// by mapping each ASCII letter to its regional indicator codepoint
// (`A` -> U+1F1E6, ..., `Z` -> U+1F1FF). Modern OSes render the resulting
// surrogate pair as the country flag; older platforms gracefully fall back to
// showing the bare letters, so the call site never needs a feature check.

const REGIONAL_INDICATOR_OFFSET = 0x1f1e6 - 65; // 'A'

export const flagEmoji = (isoCountry) => {
  const code = String(isoCountry || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(
    code.charCodeAt(0) + REGIONAL_INDICATOR_OFFSET,
    code.charCodeAt(1) + REGIONAL_INDICATOR_OFFSET,
  );
};
