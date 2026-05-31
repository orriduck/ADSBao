import assert from "node:assert/strict";

import {
  DEFAULT_LOCALE,
  LOCALE_LABELS,
  LOCALE_STORAGE_KEY,
  LOCALE_QUERY_PARAM,
  SUPPORTED_LOCALES,
  getLocaleMenuItems,
  normalizeLocaleSelection,
  nextLocale,
  readPersistedLocale,
  resolveLocaleFromSearchParams,
  resolveInitialLocale,
  resolveTranslation,
  setLocaleSearchParam,
  writePersistedLocale,
} from "./i18nModel";

assert.equal(DEFAULT_LOCALE, "en");
assert.deepEqual([...SUPPORTED_LOCALES], ["en", "zh-CN"]);
assert.equal(LOCALE_STORAGE_KEY, "adsbao:i18n:locale");
assert.equal(LOCALE_QUERY_PARAM, "locale");
assert.equal(LOCALE_LABELS.en, "EN");
assert.equal(LOCALE_LABELS["zh-CN"], "中文");

assert.deepEqual(getLocaleMenuItems(), [
  { locale: "en", label: "EN" },
  { locale: "zh-CN", label: "中文" },
]);

assert.equal(normalizeLocaleSelection("zh-CN", "en"), "zh-CN");
assert.equal(normalizeLocaleSelection("en", "zh-CN"), "en");
assert.equal(normalizeLocaleSelection("fr", "zh-CN"), "zh-CN");
assert.equal(normalizeLocaleSelection(null, "en"), "en");

// resolveInitialLocale: trust the persisted choice when valid; otherwise
// fall back to English. We deliberately don't auto-detect from navigator.
{
  assert.equal(resolveInitialLocale({ persisted: "zh-CN" }), "zh-CN");
  assert.equal(resolveInitialLocale({ persisted: "en" }), "en");
  assert.equal(resolveInitialLocale({ persisted: "fr" }), "en");
  assert.equal(resolveInitialLocale({ persisted: null }), "en");
  assert.equal(resolveInitialLocale({}), "en");
  assert.equal(
    resolveInitialLocale({ persisted: "fr", fallback: "zh-CN" }),
    "zh-CN",
  );
}

// resolveTranslation: dot-namespaced lookup, with the fallback dictionary
// rescuing missing zh-CN keys so a partially-translated UI degrades to
// English rather than leaking raw "sidebar.flights" into the layout.
{
  const en = {
    directions: { ne: "NE" },
    sidebar: { flights: "Flights", nearby: "Nearby" },
    lostSignal: { title: "{callsign} stopped reporting" },
  };
  const zh = {
    directions: { ne: "东北" },
    sidebar: { flights: "航班" },
    lostSignal: { title: "{callsign} 已停止报告" },
  };

  assert.equal(
    resolveTranslation({ key: "sidebar.flights", dictionary: zh }),
    "航班",
  );
  assert.equal(
    resolveTranslation({
      key: "sidebar.nearby",
      dictionary: zh,
      fallbackDictionary: en,
    }),
    "Nearby",
  );

  assert.equal(
    resolveTranslation({
      key: "directions.ne",
      dictionary: zh,
      fallbackDictionary: en,
    }),
    "东北",
  );
  assert.equal(
    resolveTranslation({
      key: "sidebar.missing",
      dictionary: zh,
      fallbackDictionary: en,
    }),
    "sidebar.missing",
  );
  assert.equal(
    resolveTranslation({
      key: "lostSignal.title",
      dictionary: zh,
      params: { callsign: "DAL977" },
    }),
    "DAL977 已停止报告",
  );
  // Missing param: leave the placeholder intact so a translator can spot it.
  assert.equal(
    resolveTranslation({
      key: "lostSignal.title",
      dictionary: en,
    }),
    "{callsign} stopped reporting",
  );
  // Object at the key (mis-keyed) returns the key itself, not the object.
  assert.equal(
    resolveTranslation({ key: "sidebar", dictionary: en }),
    "sidebar",
  );
}

// Storage helpers tolerate disabled storage (Safari private mode) so the
// app keeps rendering even if localStorage throws.
{
  const calls = [];
  const storage = {
    getItem(key) {
      calls.push({ type: "get", key });
      return "zh-CN";
    },
    setItem(key, value) {
      calls.push({ type: "set", key, value });
    },
  };
  assert.equal(readPersistedLocale(storage), "zh-CN");
  writePersistedLocale(storage, "zh-CN");
  writePersistedLocale(storage, "fr"); // unsupported -> ignored
  assert.deepEqual(calls, [
    { type: "get", key: LOCALE_STORAGE_KEY },
    { type: "set", key: LOCALE_STORAGE_KEY, value: "zh-CN" },
  ]);
}

{
  // Throwing storage shouldn't crash the resolver.
  const broken = {
    getItem() {
      throw new Error("disabled");
    },
    setItem() {
      throw new Error("quota");
    },
  };
  assert.equal(readPersistedLocale(broken), null);
  assert.doesNotThrow(() => writePersistedLocale(broken, "zh-CN"));
}

assert.equal(readPersistedLocale(null), null);

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
