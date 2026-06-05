import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { buildSecurityHeaders } from './securityHeaders'

const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'))

assert.equal(config.framework, 'nextjs')
assert.equal(config.outputDirectory, '.next')
assert.equal(config.rewrites, undefined)

assert.equal(existsSync(new URL('../app/api/proxy/metar/[icao]/route.ts', import.meta.url)), true)
assert.equal(existsSync(new URL('../app/api/proxy/aircraft/positions/[lat]/[lon]/[dist]/route.ts', import.meta.url)), true)
assert.equal(existsSync(new URL('../app/api/proxy/flight-routes/callsign/[callsign]/route.ts', import.meta.url)), true)
assert.equal(existsSync(new URL('../app/api/proxy/local-weather/[lat]/[lon]/route.ts', import.meta.url)), true)

const headers = buildSecurityHeaders()
const globalHeaders = Object.fromEntries(
  headers
    .find((entry) => entry.source === '/:path*')
    .headers.map((header) => [header.key, header.value]),
)

assert.match(globalHeaders['Content-Security-Policy'], /frame-ancestors 'none'/)
assert.match(globalHeaders['Content-Security-Policy'], /connect-src[^;]*https:\/\/tiles\.openfreemap\.org/)
assert.match(globalHeaders['Content-Security-Policy'], /connect-src[^;]*https:\/\/\*\.tile\.opentopomap\.org/)
assert.match(globalHeaders['Content-Security-Policy'], /connect-src[^;]*https:\/\/s3\.amazonaws\.com/)
assert.equal(
  globalHeaders['Strict-Transport-Security'],
  'max-age=63072000; includeSubDomains; preload',
)
assert.equal(globalHeaders['X-Frame-Options'], 'DENY')
assert.equal(globalHeaders['X-Content-Type-Options'], 'nosniff')
assert.equal(globalHeaders['Referrer-Policy'], 'strict-origin-when-cross-origin')
assert.match(globalHeaders['Permissions-Policy'], /microphone=\(\)/)
assert.match(globalHeaders['Permissions-Policy'], /geolocation=\(self\)/)
