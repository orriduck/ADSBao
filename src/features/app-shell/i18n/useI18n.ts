import { useCallback, useContext, useMemo } from "react";
import {
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  DEFAULT_LOCALE,
  nextLocale,
  normalizeLocaleSelection,
  setLocaleSearchParam,
} from "./i18nModel";
import { I18nRuntimeContext } from "./i18nProvider";

export function useI18n() {
  const runtime = useContext(I18nRuntimeContext);
  const locale = normalizeLocaleSelection(runtime.locale, DEFAULT_LOCALE);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const setLocale = useCallback(
    (next) => {
      const selected = normalizeLocaleSelection(next, locale);
      if (selected === locale) return;
      runtime.setLocale(selected);
      navigate(
        setLocaleSearchParam(pathname, searchParams.toString(), selected),
        { replace: true },
      );
    },
    [locale, navigate, pathname, runtime, searchParams],
  );

  const cycle = useCallback(() => {
    setLocale(nextLocale(locale));
  }, [locale, setLocale]);

  const t = useCallback(
    (key: string, params?: Record<string, unknown>) => {
      return interpolateMessage(resolveMessage(runtime.messages, key), params);
    },
    [runtime.messages],
  );

  return useMemo(
    () => ({ locale, setLocale, cycle, t }),
    [locale, setLocale, cycle, t],
  );
}

function resolveMessage(messages: Record<string, unknown>, key: string) {
  const segments = String(key || "").split(".").filter(Boolean);
  let current: unknown = messages;
  for (const segment of segments) {
    if (!current || typeof current !== "object") return key;
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === "string" ? current : key;
}

function interpolateMessage(message: string, params?: Record<string, unknown>) {
  if (!params) return message;
  return message.replace(/\{([A-Za-z0-9_.-]+)\}/g, (_, name) =>
    params[name] == null ? "" : String(params[name]),
  );
}
