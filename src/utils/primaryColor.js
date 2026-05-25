const PRIMARY_KEY = 'primary'
const PRIMARY_YELLOW = 'yellow'
const PRIMARY_TEAL = 'teal'
const FALLBACK_PRIMARY = PRIMARY_YELLOW

const PRIMARIES = [PRIMARY_YELLOW, PRIMARY_TEAL]

const PRIMARY_COLOR_MAP = {
  [PRIMARY_YELLOW]: { bright: '#ffe600', deep: '#a86a1f' },
  [PRIMARY_TEAL]: { bright: '#83d5cf', deep: '#2d746d' },
}

const sanitizePrimary = (primary) =>
  PRIMARIES.includes(primary) ? primary : FALLBACK_PRIMARY

const readStoredPrimary = (storage = window.localStorage) =>
  sanitizePrimary(storage.getItem(PRIMARY_KEY))

const PRIMARY_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

// Mirrors the theme cookie pattern — SSR reads this to render the right
// data-primary attribute on <html>, avoiding a flash of the default
// palette on cold loads.
const writePrimaryCookie = (primary) => {
  if (typeof document === 'undefined') return
  const safe = sanitizePrimary(primary)
  document.cookie = `${PRIMARY_KEY}=${safe}; Path=/; Max-Age=${PRIMARY_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`
}

const applyPrimaryPreference = ({
  primary,
  root = document.documentElement,
} = {}) => {
  const safe = sanitizePrimary(primary)
  root.setAttribute('data-primary', safe)
  writePrimaryCookie(safe)
  return { primary: safe }
}

const writeStoredPrimary = (primary, storage = window.localStorage) => {
  const safe = sanitizePrimary(primary)
  storage.setItem(PRIMARY_KEY, safe)
}

const initPrimaryPreference = ({
  storage = window.localStorage,
  root = document.documentElement,
} = {}) => {
  const primary = readStoredPrimary(storage)
  return applyPrimaryPreference({ primary, root })
}

export {
  PRIMARY_KEY,
  PRIMARY_YELLOW,
  PRIMARY_TEAL,
  PRIMARIES,
  PRIMARY_COLOR_MAP,
  applyPrimaryPreference,
  initPrimaryPreference,
  readStoredPrimary,
  sanitizePrimary,
  writeStoredPrimary,
}
