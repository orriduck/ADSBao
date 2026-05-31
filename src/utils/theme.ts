const THEME_KEY = 'theme'
const THEME_LIGHT = 'light'
const THEME_DARK = 'dark'
const THEME_SYSTEM = 'system'
const FALLBACK_THEME = THEME_SYSTEM

type ThemePreference = typeof THEME_LIGHT | typeof THEME_DARK | typeof THEME_SYSTEM
type ThemeStorage = {
  getItem(key: string): unknown
  setItem(key: string, value: string): void
}
type ThemeRoot = Pick<Element, "setAttribute">
type ThemeMediaQueryList = Pick<MediaQueryList, "matches">

const THEMES: ThemePreference[] = [THEME_LIGHT, THEME_DARK, THEME_SYSTEM]

const getSystemTheme = (mediaQueryList: ThemeMediaQueryList = window.matchMedia('(prefers-color-scheme: dark)')) =>
  mediaQueryList.matches ? THEME_DARK : THEME_LIGHT

const sanitizeTheme = (theme: unknown): ThemePreference =>
  THEMES.includes(theme as ThemePreference) ? (theme as ThemePreference) : FALLBACK_THEME

const readStoredTheme = (storage: ThemeStorage = window.localStorage) => sanitizeTheme(storage.getItem(THEME_KEY))

const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

// The cookie carries the RESOLVED theme (light/dark), never "system".
// SSR can then render the right data-theme directly even when the user
// runs on system preference — no flash on cold loads / hard refreshes.
const writeResolvedThemeCookie = (resolvedTheme: unknown) => {
  if (typeof document === 'undefined') return
  if (resolvedTheme !== THEME_LIGHT && resolvedTheme !== THEME_DARK) return
  document.cookie = `${THEME_KEY}=${resolvedTheme}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`
}

const applyThemePreference = ({
  theme,
  root = document.documentElement,
  mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)'),
}: {
  theme?: unknown
  root?: ThemeRoot
  mediaQueryList?: ThemeMediaQueryList
} = {}) => {
  const safeTheme = sanitizeTheme(theme)
  const resolvedTheme = safeTheme === THEME_SYSTEM ? getSystemTheme(mediaQueryList) : safeTheme

  root.setAttribute('data-theme', resolvedTheme)
  writeResolvedThemeCookie(resolvedTheme)

  return { preference: safeTheme, resolvedTheme }
}

const writeStoredTheme = (theme: unknown, storage: ThemeStorage = window.localStorage) => {
  const safe = sanitizeTheme(theme)
  storage.setItem(THEME_KEY, safe)
}

const initThemePreference = ({
  storage = window.localStorage,
  root = document.documentElement,
  mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)'),
}: {
  storage?: ThemeStorage
  root?: ThemeRoot
  mediaQueryList?: ThemeMediaQueryList
} = {}) => {
  const preference = readStoredTheme(storage)
  return applyThemePreference({ theme: preference, root, mediaQueryList })
}

const nextTheme = (theme: unknown) => {
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
