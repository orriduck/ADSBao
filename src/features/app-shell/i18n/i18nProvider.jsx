"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DICTIONARIES } from "@/config/i18n/index.js";
import {
  DEFAULT_LOCALE,
  nextLocale as cycleLocale,
  normalizeLocaleSelection,
  readPersistedLocale,
  resolveInitialLocale,
  resolveTranslation,
  writePersistedLocale,
} from "./i18nModel.js";

export const I18nContext = createContext(null);

const safeStorage = () =>
  typeof window === "undefined" ? null : window.localStorage;

export function I18nProvider({ children }) {
  // SSR renders English so the markup matches the unhydrated server output.
  // Client effect then upgrades to whatever the user persisted last time —
  // this avoids a hydration mismatch from reading localStorage during the
  // initial render.
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);

  useEffect(() => {
    const persisted = readPersistedLocale(safeStorage());
    const resolved = resolveInitialLocale({ persisted });
    if (resolved !== locale) setLocaleState(resolved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((next) => {
    setLocaleState((current) => {
      const selected = normalizeLocaleSelection(next, current);
      if (current === selected) return current;
      writePersistedLocale(safeStorage(), selected);
      return selected;
    });
  }, []);

  const cycle = useCallback(() => {
    setLocaleState((current) => {
      const next = cycleLocale(current);
      writePersistedLocale(safeStorage(), next);
      return next;
    });
  }, []);

  const t = useCallback(
    (key, params) =>
      resolveTranslation({
        key,
        dictionary: DICTIONARIES[locale],
        fallbackDictionary: DICTIONARIES[DEFAULT_LOCALE],
        params,
      }),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, cycle, t }),
    [locale, setLocale, cycle, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
