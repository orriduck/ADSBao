import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  THEME_SYSTEM,
  applyThemePreference,
  initThemePreference,
  nextTheme,
  sanitizeTheme,
  writeStoredTheme,
} from "../../utils/theme";
import { getThemeIconKey, getThemeTitle } from "./themePreference";

export function useThemePreference() {
  const [themePreference, setThemePreference] = useState(THEME_SYSTEM);
  const mediaQueryList = useRef(null);
  const themePreferenceRef = useRef(THEME_SYSTEM);

  useEffect(() => {
    themePreferenceRef.current = themePreference;
  }, [themePreference]);

  useEffect(() => {
    mediaQueryList.current = window.matchMedia("(prefers-color-scheme: dark)");
    const initialized = initThemePreference({
      mediaQueryList: mediaQueryList.current,
    });
    setThemePreference(initialized.preference);
    themePreferenceRef.current = initialized.preference;
    // Mirror localStorage into the cookie so the server-rendered
    // <html data-theme> matches the user's stored choice on the next
    // request. One-shot migration for users who pre-date the cookie.
    writeStoredTheme(initialized.preference);

    const listener = () => {
      if (themePreferenceRef.current === THEME_SYSTEM) {
        applyThemePreference({
          theme: THEME_SYSTEM,
          mediaQueryList: mediaQueryList.current,
        });
      }
    };

    mediaQueryList.current.addEventListener("change", listener);
    return () => mediaQueryList.current?.removeEventListener("change", listener);
  }, []);

  const applySelectedTheme = useCallback((theme) => {
    const next = sanitizeTheme(theme);
    setThemePreference(next);
    themePreferenceRef.current = next;
    writeStoredTheme(next);
    applyThemePreference({
      theme: next,
      mediaQueryList: mediaQueryList.current,
    });
  }, []);

  const selectTheme = useCallback((theme) => {
    const next = sanitizeTheme(theme);
    applySelectedTheme(next);
    return true;
  }, [applySelectedTheme]);

  const cycleTheme = useCallback(() => {
    selectTheme(nextTheme(themePreferenceRef.current));
  }, [selectTheme]);

  return useMemo(
    () => ({
      themePreference,
      themeTitle: getThemeTitle(themePreference),
      themeIconKey: getThemeIconKey(themePreference),
      cycleTheme,
      selectTheme,
    }),
    [cycleTheme, selectTheme, themePreference],
  );
}
