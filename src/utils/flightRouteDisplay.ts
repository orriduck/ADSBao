import { getFlightRouteAirlineIconUrl } from '../features/aviation/airlineLogoModel'

export { getFlightRouteAirlineIconUrl }

const airportCode = (airport) =>
  String(airport?.iata || airport?.icao || '').trim().toUpperCase()

const airportMunicipality = (airport) =>
  String(airport?.municipality || airportCode(airport)).trim()

const airportCodes = (airport) =>
  new Set(
    [airport?.iata, airport?.icao]
      .map((code) => String(code || '').trim().toUpperCase())
      .filter(Boolean),
  )

const sameAirport = (a, b) => {
  const aCodes = airportCodes(a)
  const bCodes = airportCodes(b)
  return [...aCodes].some((code) => bCodes.has(code))
}

const normalizedRouteSource = (route) =>
  String(route?.source || '').trim().toLowerCase()

const routeAccuracySuffix = (route) =>
  normalizedRouteSource(route) === 'adsbdb' ? '*' : ''

export const formatFlightRouteLabel = (route) => {
  const origin = airportCode(route?.origin)
  const destination = airportCode(route?.destination)
  if (!origin || !destination) return ''
  if (sameAirport(route.origin, route.destination)) return ''
  return `${origin} -> ${destination}${routeAccuracySuffix(route)}`
}

export const formatFlightRouteMunicipalityLabel = (route) => {
  const origin = airportMunicipality(route?.origin)
  const destination = airportMunicipality(route?.destination)
  if (!origin || !destination) return ''
  if (sameAirport(route.origin, route.destination)) return ''
  return `${origin} -> ${destination}${routeAccuracySuffix(route)}`
}

// Origin / destination codes for the preview-card route line. Empty strings
// when the route is incomplete or a same-airport (circular) route.
export const getFlightRouteEndpoints = (route) => {
  const origin = airportCode(route?.origin)
  const destination = airportCode(route?.destination)
  if (!origin || !destination || sameAirport(route?.origin, route?.destination)) {
    return { origin: '', destination: '' }
  }
  return { origin, destination }
}

export const getFlightRouteAccuracyNotice = (route) =>
  normalizedRouteSource(route) === 'adsbdb'
    ? "This route may be inaccurate: adsbdb uses callsign reference data that may not match today's actual origin and destination."
    : ''

// ICAO-first airport code (KBOS), falling back to IATA. RouteBadge renders the
// 4-letter ICAO identifiers to match the rest of the app's airport language.
const airportIcaoCode = (airport) =>
  String(airport?.icao || airport?.iata || '').trim().toUpperCase()

// Resolve <RouteBadge> props from a flight route. Returns null when the route
// is incomplete or circular (same airport) — the badge should render nothing.
// `uncertain` flags adsbdb-sourced routes so the badge can show a faint marker.
export const routeBadgePropsFromRoute = (route) => {
  const from = airportIcaoCode(route?.origin)
  const to = airportIcaoCode(route?.destination)
  if (!from || !to || sameAirport(route?.origin, route?.destination)) return null
  return {
    from,
    to,
    airlineLogoUrl: getFlightRouteAirlineIconUrl(route) || undefined,
    uncertain: normalizedRouteSource(route) === 'adsbdb',
  }
}
