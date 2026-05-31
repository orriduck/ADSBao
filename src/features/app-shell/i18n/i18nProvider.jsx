"use client";

import {
  createContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { NextIntlClientProvider } from "next-intl";
import { useSearchParams } from "next/navigation";
import { DICTIONARIES } from "@/config/i18n/index.js";
import {
  DEFAULT_LOCALE,
  LOCALE_QUERY_PARAM,
  normalizeLocaleSelection,
} from "./i18nModel.js";

export const I18nRuntimeContext = createContext({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

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

export function I18nProvider({ children, initialLocale = DEFAULT_LOCALE }) {
  const searchParams = useSearchParams();
  const [locale, setLocale] = useState(() =>
    normalizeLocaleSelection(initialLocale, DEFAULT_LOCALE),
  );

  useEffect(() => {
    const selected = normalizeLocaleSelection(
      searchParams.get(LOCALE_QUERY_PARAM),
      initialLocale,
    );
    setLocale((current) => (current === selected ? current : selected));
  }, [initialLocale, searchParams]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const messages = useMemo(
    () =>
      mergeMessages(
        DICTIONARIES[DEFAULT_LOCALE],
        DICTIONARIES[locale],
      ),
    [locale],
  );
  const runtime = useMemo(
    () => ({
      locale,
      setLocale,
    }),
    [locale],
  );

  return (
    <NextIntlClientProvider key={locale} locale={locale} messages={messages}>
      <I18nRuntimeContext.Provider value={runtime}>
        {children}
      </I18nRuntimeContext.Provider>
    </NextIntlClientProvider>
  );
}
