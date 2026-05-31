// Pure helpers for the i18n provider so the lookup + storage logic can be
// unit-tested without React.

export const DEFAULT_LOCALE = "en";
export const SUPPORTED_LOCALES = Object.freeze(["en", "zh-CN"]);
export const LOCALE_STORAGE_KEY = "adsbao:i18n:locale";
export const LOCALE_QUERY_PARAM = "locale";
export const ADSBAO_LOCALE_HEADER = "x-adsbao-locale";

export const LOCALE_LABELS = Object.freeze({
  en: "EN",
  "zh-CN": "中文",
});

const isSupportedLocale = (value) =>
  typeof value === "string" && SUPPORTED_LOCALES.includes(value);

export function getLocaleMenuItems() {
  return SUPPORTED_LOCALES.map((locale) => ({
    locale,
    label: LOCALE_LABELS[locale] || locale,
  }));
}

export function normalizeLocaleSelection(next, current = DEFAULT_LOCALE) {
  if (isSupportedLocale(next)) return next;
  return isSupportedLocale(current) ? current : DEFAULT_LOCALE;
}

// Pick a locale to start with. We deliberately do not auto-detect from
// navigator.language — the issue scopes us to: persisted preference, else
// English. Auto-detection causes server/client hydration mismatches and
// surprises returning users.
export function resolveInitialLocale({
  persisted,
  fallback = DEFAULT_LOCALE,
} = {}) {
  return isSupportedLocale(persisted) ? persisted : fallback;
}

const splitKey = (key) =>
  String(key || "")
    .split(".")
    .filter(Boolean);

const lookupByPath = (dictionary, segments) => {
  let cursor = dictionary;
  for (const segment of segments) {
    if (cursor == null || typeof cursor !== "object") return undefined;
    cursor = cursor[segment];
  }
  return typeof cursor === "string" ? cursor : undefined;
};

const applyParams = (template, params) => {
  if (!params || typeof params !== "object") return template;
  return template.replace(/\{(\w+)\}/g, (_, name) =>
    Object.prototype.hasOwnProperty.call(params, name)
      ? String(params[name])
      : `{${name}}`,
  );
};

// Look up `key` in `dictionary`, with `fallbackDictionary` as a backstop so
// a missing zh-CN key still renders English instead of the raw key. If
// neither dictionary has it, the key itself is returned — that surface in
// the UI is the signal a translator should plug it in.
export function resolveTranslation({
  key,
  dictionary,
  fallbackDictionary,
  params,
} = {}) {
  const segments = splitKey(key);
  if (segments.length === 0) return "";
  const primary = lookupByPath(dictionary, segments);
  if (primary !== undefined) return applyParams(primary, params);
  const fallback = lookupByPath(fallbackDictionary, segments);
  if (fallback !== undefined) return applyParams(fallback, params);
  return key;
}

export function readPersistedLocale(storage) {
  if (!storage) return null;
  try {
    return storage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writePersistedLocale(storage, locale) {
  if (!storage) return;
  try {
    if (isSupportedLocale(locale)) {
      storage.setItem(LOCALE_STORAGE_KEY, locale);
    }
  } catch {
    /* Quota exceeded or storage disabled — preference just won't persist. */
  }
}

export function nextLocale(current) {
  const index = SUPPORTED_LOCALES.indexOf(current);
  // Unknown current locale points to "before the start" so the cycle
  // lands on SUPPORTED_LOCALES[0] (English) — a predictable recovery
  // when something hands us a stale value.
  const safeIndex = index >= 0 ? index : -1;
  return SUPPORTED_LOCALES[(safeIndex + 1) % SUPPORTED_LOCALES.length];
}

export function resolveLocaleFromSearchParams(searchParams) {
  const params =
    searchParams instanceof URLSearchParams
      ? searchParams
      : new URLSearchParams(String(searchParams || "").replace(/^\?/, ""));
  const raw = params.get(LOCALE_QUERY_PARAM);
  return isSupportedLocale(raw) ? raw : null;
}

export function setLocaleSearchParam(pathname = "/", search = "", locale = DEFAULT_LOCALE) {
  const selectedLocale = normalizeLocaleSelection(locale, DEFAULT_LOCALE);
  const params =
    search instanceof URLSearchParams
      ? new URLSearchParams(search)
      : new URLSearchParams(String(search || "").replace(/^\?/, ""));
  params.set(LOCALE_QUERY_PARAM, selectedLocale);
  const query = params.toString();
  const basePath = String(pathname || "/");
  return query ? `${basePath}?${query}` : basePath;
}
