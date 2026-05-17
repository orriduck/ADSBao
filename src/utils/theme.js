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

const applyThemePreference = ({
  theme,
  root = document.documentElement,
  mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)'),
} = {}) => {
  const safeTheme = sanitizeTheme(theme)
  const resolvedTheme = safeTheme === THEME_SYSTEM ? getSystemTheme(mediaQueryList) : safeTheme

  root.setAttribute('data-theme', resolvedTheme)

  return { preference: safeTheme, resolvedTheme }
}

const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

const writeStoredTheme = (theme, storage = window.localStorage) => {
  const safe = sanitizeTheme(theme)
  storage.setItem(THEME_KEY, safe)
  // Mirror the preference into a cookie so the Next.js server layout
  // can read it on the next request and render the right data-theme
  // attribute directly — no client-side boot script needed.
  if (typeof document !== 'undefined') {
    document.cookie = `${THEME_KEY}=${safe}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`
  }
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
