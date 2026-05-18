const THEME_KEY = 'theme'
const THEME_LIGHT = 'light'
const THEME_DARK = 'dark'
const THEME_SYSTEM = 'system'
const FALLBACK_THEME = THEME_SYSTEM

const THEMES = [THEME_LIGHT, THEME_DARK, THEME_SYSTEM]

const getSystemTheme = (mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)')) =>
  mediaQueryList.matches ? THEME_DARK : THEME_LIGHT

const sanitizeTheme = (theme) => (THEMES.includes(theme) ? theme : FALLBACK_THEME)

const readStoredTheme = (storage = window.localStorage) => sanitizeTheme(storage.getItem(THEME_KEY))

const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

// The cookie carries the RESOLVED theme (light/dark), never "system".
// SSR can then render the right data-theme directly even when the user
// runs on system preference — no flash on cold loads / hard refreshes.
const writeResolvedThemeCookie = (resolvedTheme) => {
  if (typeof document === 'undefined') return
  if (resolvedTheme !== THEME_LIGHT && resolvedTheme !== THEME_DARK) return
  document.cookie = `${THEME_KEY}=${resolvedTheme}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`
}

const applyThemePreference = ({
  theme,
  root = document.documentElement,
  mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)'),
} = {}) => {
  const safeTheme = sanitizeTheme(theme)
  const resolvedTheme = safeTheme === THEME_SYSTEM ? getSystemTheme(mediaQueryList) : safeTheme

  root.setAttribute('data-theme', resolvedTheme)
  writeResolvedThemeCookie(resolvedTheme)

  return { preference: safeTheme, resolvedTheme }
}

const writeStoredTheme = (theme, storage = window.localStorage) => {
  const safe = sanitizeTheme(theme)
  storage.setItem(THEME_KEY, safe)
}

const initThemePreference = ({
  storage = window.localStorage,
  root = document.documentElement,
  mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)'),
} = {}) => {
  const preference = readStoredTheme(storage)
  return applyThemePreference({ theme: preference, root, mediaQueryList })
}

const nextTheme = (theme) => {
  const safeTheme = sanitizeTheme(theme)
  const currentIndex = THEMES.indexOf(safeTheme)
  return THEMES[(currentIndex + 1) % THEMES.length]
}

export {
  THEME_KEY,
  THEME_LIGHT,
  THEME_DARK,
  THEME_SYSTEM,
  THEMES,
  applyThemePreference,
  getSystemTheme,
  initThemePreference,
  nextTheme,
  readStoredTheme,
  sanitizeTheme,
  writeStoredTheme,
}
