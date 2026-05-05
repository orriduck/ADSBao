import {
  THEME_DARK,
  THEME_LIGHT,
  THEME_SYSTEM,
  sanitizeTheme,
} from "../../utils/theme.js";

export const getThemeTitle = (theme) => {
  const safeTheme = sanitizeTheme(theme);
  if (safeTheme === THEME_LIGHT) return "Theme: Light (click to switch)";
  if (safeTheme === THEME_DARK) return "Theme: Dark (click to switch)";
  return "Theme: System (click to switch)";
};

export const getThemeIconKey = (theme) => {
  const safeTheme = sanitizeTheme(theme);
  if (safeTheme === THEME_LIGHT) return "sun";
  if (safeTheme === THEME_DARK) return "moon";
  return "monitor";
};
