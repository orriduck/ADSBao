import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { DICTIONARIES } from "@/config/i18n/index.js";
import {
  ADSBAO_LOCALE_HEADER,
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  normalizeLocaleSelection,
} from "@/features/app-shell/i18n/i18nModel.js";

const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const mergeMessages = (fallback, messages) => {
  if (!isPlainObject(fallback)) return messages;
  if (!isPlainObject(messages)) return fallback;
  return Object.fromEntries(
    Object.entries(fallback).map(([key, value]) => [
      key,
      isPlainObject(value)
        ? mergeMessages(value, messages[key])
        : messages[key] ?? value,
    ]),
  );
};

export default getRequestConfig(async () => {
  const requestHeaders = await headers();
  const store = await cookies();
  const locale = normalizeLocaleSelection(
    requestHeaders.get(ADSBAO_LOCALE_HEADER)
      || store.get(LOCALE_STORAGE_KEY)?.value
      || DEFAULT_LOCALE,
  );
  const fallbackMessages = DICTIONARIES[DEFAULT_LOCALE];
  const localeMessages = DICTIONARIES[locale];

  return {
    locale,
    messages: mergeMessages(fallbackMessages, localeMessages),
  };
});
