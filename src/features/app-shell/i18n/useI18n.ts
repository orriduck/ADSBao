"use client";

import { useCallback, useContext, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  nextLocale,
  normalizeLocaleSelection,
  setLocaleSearchParam,
} from "./i18nModel";
import { I18nRuntimeContext } from "./i18nProvider";

export function useI18n() {
  const intlLocale = useLocale();
  const runtime = useContext(I18nRuntimeContext);
  const locale = normalizeLocaleSelection(runtime.locale, intlLocale);
  const translate = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const setLocale = useCallback(
    (next) => {
      const selected = normalizeLocaleSelection(next, locale);
      if (selected === locale) return;
      runtime.setLocale(selected);
      router.replace(
        setLocaleSearchParam(pathname, searchParams.toString(), selected),
        { scroll: false },
      );
    },
    [locale, pathname, router, runtime, searchParams],
  );

  const cycle = useCallback(() => {
    setLocale(nextLocale(locale));
  }, [locale, setLocale]);

  const t = useCallback(
    (key: string, params?: Record<string, unknown>) => {
      try {
        return translate(key, params as any);
      } catch {
        return String(key || "");
      }
    },
    [translate],
  );

  return useMemo(
    () => ({ locale, setLocale, cycle, t }),
    [locale, setLocale, cycle, t],
  );
}
