import assert from 'node:assert/strict'

import {
  THEME_DARK,
  THEME_LIGHT,
  THEME_SYSTEM,
  applyThemePreference,
  nextTheme,
  readStoredTheme,
  sanitizeTheme,
  writeStoredTheme,
} from './theme'

const createStorage = (seed = {}) => {
  const data = new Map(Object.entries(seed))
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null
    },
    setItem(key, value) {
      data.set(key, value)
    },
  }
}

const createRoot = () => {
  const attrs = new Map()
  return {
    attrs,
    setAttribute(key, value) {
      attrs.set(key, value)
    },
  }
}

// Stub out document.cookie so applyThemePreference doesn't crash in Node
// and we can assert what gets written.
const cookieJar = { value: '' }
globalThis.document = {
  get cookie() {
    return cookieJar.value
  },
  set cookie(next) {
    cookieJar.value = next
  },
}

assert.equal(sanitizeTheme('light'), THEME_LIGHT)
assert.equal(sanitizeTheme('wat'), THEME_SYSTEM)

assert.equal(nextTheme(THEME_LIGHT), THEME_DARK)
assert.equal(nextTheme(THEME_DARK), THEME_SYSTEM)
assert.equal(nextTheme(THEME_SYSTEM), THEME_LIGHT)

const storage = createStorage({ theme: 'wat' })
assert.equal(readStoredTheme(storage), THEME_SYSTEM)
writeStoredTheme(THEME_DARK, storage)
assert.equal(readStoredTheme(storage), THEME_DARK)

const darkRoot = createRoot()
const darkResult = applyThemePreference({
  theme: THEME_SYSTEM,
  root: darkRoot,
  mediaQueryList: { matches: true },
})
assert.equal(darkResult.preference, THEME_SYSTEM)
assert.equal(darkResult.resolvedTheme, THEME_DARK)
assert.equal(darkRoot.attrs.get('data-theme'), THEME_DARK)

const lightRoot = createRoot()
const lightResult = applyThemePreference({
  theme: THEME_LIGHT,
  root: lightRoot,
  mediaQueryList: { matches: true },
})
assert.equal(lightResult.preference, THEME_LIGHT)
assert.equal(lightResult.resolvedTheme, THEME_LIGHT)
assert.equal(lightRoot.attrs.get('data-theme'), THEME_LIGHT)

// applyThemePreference writes the RESOLVED theme to the cookie even
// when the preference is "system" — that's what kills the SSR dark
// flash for system-preference users on the next page load.
cookieJar.value = ''
applyThemePreference({
  theme: THEME_SYSTEM,
  root: createRoot(),
  mediaQueryList: { matches: false },
})
assert.ok(cookieJar.value.startsWith('theme=light;'), `expected resolved light cookie, got "${cookieJar.value}"`)

cookieJar.value = ''
writeStoredTheme(THEME_SYSTEM, storage)
assert.equal(cookieJar.value, '', 'writeStoredTheme should not touch the cookie')

console.log('theme utility tests passed')
