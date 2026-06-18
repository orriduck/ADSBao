// Pure helpers for the i18n provider so the lookup + storage logic can be
// unit-tested without React.

export const DEFAULT_LOCALE = "en";
export const SUPPORTED_LOCALES = Object.freeze(["en", "zh-CN"]);
export const LOCALE_STORAGE_KEY = "adsbao:i18n:locale";
export const LOCALE_QUERY_PARAM = "locale";

const LOCALE_LABELS = Object.freeze({
  en: "EN",
  "zh-CN": "中文",
});

const isSupportedLocale = (value: unknown): value is string =>
  typeof value === "string" && SUPPORTED_LOCALES.includes(value);

export function getLocaleMenuItems() {
  return SUPPORTED_LOCALES.map((locale) => ({
    locale,
    label: LOCALE_LABELS[locale] || locale,
  }));
}

export function normalizeLocaleSelection(
  next: unknown,
  current: string = DEFAULT_LOCALE,
) {
  if (isSupportedLocale(next)) return next;
  return isSupportedLocale(current) ? current : DEFAULT_LOCALE;
}

export function nextLocale(current: string) {
  const index = SUPPORTED_LOCALES.indexOf(current);
  // Unknown current locale points to "before the start" so the cycle
  // lands on SUPPORTED_LOCALES[0] (English) — a predictable recovery
  // when something hands us a stale value.
  const safeIndex = index >= 0 ? index : -1;
  return SUPPORTED_LOCALES[(safeIndex + 1) % SUPPORTED_LOCALES.length];
}

export function resolveLocaleFromSearchParams(searchParams: string | URLSearchParams) {
  const params =
    searchParams instanceof URLSearchParams
      ? searchParams
      : new URLSearchParams(String(searchParams || "").replace(/^\?/, ""));
  const raw = params.get(LOCALE_QUERY_PARAM);
  return isSupportedLocale(raw) ? raw : null;
}

export function setLocaleSearchParam(
  pathname = "/",
  search: string | URLSearchParams = "",
  locale = DEFAULT_LOCALE,
) {
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
