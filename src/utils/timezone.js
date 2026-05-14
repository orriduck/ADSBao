// Resolves an IANA timezone string for a country code via
// `countries-and-timezones`. Only returns a result for countries that sit in
// a single timezone — multi-timezone countries (US, CA, AU, RU, BR, MX, ID,
// CN, etc.) would need the airport's location to pick the right zone, and
// guessing alphabetically would mislead, so we return null and let the
// caller hide the row entirely.

import ct from "countries-and-timezones";

export const resolveTimezone = (country) => {
  const code = String(country || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  const timezones = ct.getCountry(code)?.timezones;
  if (!timezones || timezones.length !== 1) return null;
  return timezones[0];
};
