import assert from "node:assert/strict";

import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  LOCALE_QUERY_PARAM,
  SUPPORTED_LOCALES,
  getLocaleMenuItems,
  normalizeLocaleSelection,
  nextLocale,
  resolveLocaleFromSearchParams,
  setLocaleSearchParam,
} from "./i18nModel";

assert.equal(DEFAULT_LOCALE, "en");
assert.deepEqual([...SUPPORTED_LOCALES], ["en", "zh-CN"]);
assert.equal(LOCALE_STORAGE_KEY, "adsbao:i18n:locale");
assert.equal(LOCALE_QUERY_PARAM, "locale");

assert.deepEqual(getLocaleMenuItems(), [
  { locale: "en", label: "EN" },
  { locale: "zh-CN", label: "中文" },
]);

assert.equal(normalizeLocaleSelection("zh-CN", "en"), "zh-CN");
assert.equal(normalizeLocaleSelection("en", "zh-CN"), "en");
assert.equal(normalizeLocaleSelection("fr", "zh-CN"), "zh-CN");
assert.equal(normalizeLocaleSelection(null, "en"), "en");

// nextLocale cycles through the supported list so a one-button toggle has
// a well-defined order independent of how many locales we add later.
assert.equal(nextLocale("en"), "zh-CN");
assert.equal(nextLocale("zh-CN"), "en");
assert.equal(nextLocale("fr"), "en"); // unknown -> start of list

// Query-param routing: the selected language is visible and shareable without
// changing ADSBao's current path structure.
assert.equal(resolveLocaleFromSearchParams("locale=zh-CN"), "zh-CN");
assert.equal(resolveLocaleFromSearchParams("?locale=en"), "en");
assert.equal(resolveLocaleFromSearchParams("locale=fr"), null);
assert.equal(resolveLocaleFromSearchParams(""), null);
assert.equal(setLocaleSearchParam("/", "", "zh-CN"), "/?locale=zh-CN");
assert.equal(
  setLocaleSearchParam("/airport/kbos", "panel=weather", "zh-CN"),
  "/airport/kbos?panel=weather&locale=zh-CN",
);
assert.equal(
  setLocaleSearchParam("/aircraft/DAL977", "?locale=en&trace=1", "zh-CN"),
  "/aircraft/DAL977?locale=zh-CN&trace=1",
);
assert.equal(setLocaleSearchParam("/about", "", "fr"), "/about?locale=en");
