"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  THEME_SYSTEM,
  applyThemePreference,
  initThemePreference,
  nextTheme,
  writeStoredTheme,
} from "../../utils/theme.js";
import { getThemeIconKey, getThemeTitle } from "./themePreference.js";

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

  const cycleTheme = useCallback(() => {
    const next = nextTheme(themePreferenceRef.current);
    themePreferenceRef.current = next;
    setThemePreference(next);
    writeStoredTheme(next);
    applyThemePreference({
      theme: next,
      mediaQueryList: mediaQueryList.current,
    });
  }, []);

  return useMemo(
    () => ({
      themePreference,
      themeTitle: getThemeTitle(themePreference),
      themeIconKey: getThemeIconKey(themePreference),
      cycleTheme,
    }),
    [cycleTheme, themePreference],
  );
}
