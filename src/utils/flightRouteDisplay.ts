export { getFlightRouteAirlineIconUrl } from '../features/aviation/airlineLogoModel'

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
