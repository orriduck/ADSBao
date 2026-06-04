import {
  THEME_DARK,
  THEME_LIGHT,
  THEME_SUNRISE,
  THEME_SUNSET,
  THEME_SYSTEM,
  sanitizeTheme,
} from "../../utils/theme";

export const getThemeTitle = (theme) => {
  const safeTheme = sanitizeTheme(theme);
  if (safeTheme === THEME_LIGHT) return "Theme: Light (click to switch)";
  if (safeTheme === THEME_DARK) return "Theme: Dark (click to switch)";
  if (safeTheme === THEME_SUNRISE) return "Theme: Dawn (click to switch)";
  if (safeTheme === THEME_SUNSET) return "Theme: Sunset (click to switch)";
  return "Theme: System (click to switch)";
};

export const getThemeIconKey = (theme) => {
  const safeTheme = sanitizeTheme(theme);
  if (safeTheme === THEME_LIGHT) return "sun";
  if (safeTheme === THEME_DARK) return "moon";
  if (safeTheme === THEME_SUNRISE) return "sunrise";
  if (safeTheme === THEME_SUNSET) return "sunset";
  return "monitor";
};
