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

// Community-feedback routes carry a `displaySuffix` (currently "*") so the
// renderer can mark them as user-supplied at a glance. Suffix only attaches
// when we *have* a renderable route — an empty label stays empty.
const routeDisplaySuffix = (route) =>
  String(route?.displaySuffix || '').trim()

const normalizedRouteSource = (route) =>
  String(route?.source || '').trim().toLowerCase()

const routeAccuracySuffix = (route) =>
  normalizedRouteSource(route) === 'adsbdb' ? '*' : ''

const combinedRouteSuffix = (route) => {
  const suffixes = [routeDisplaySuffix(route), routeAccuracySuffix(route)]
    .filter(Boolean)
  return [...new Set(suffixes)].join('')
}

export const formatFlightRouteLabel = (route) => {
  const origin = airportCode(route?.origin)
  const destination = airportCode(route?.destination)
  if (!origin || !destination) return ''
  if (sameAirport(route.origin, route.destination)) return ''
  return `${origin} -> ${destination}${combinedRouteSuffix(route)}`
}

export const formatFlightRouteMunicipalityLabel = (route) => {
  const origin = airportMunicipality(route?.origin)
  const destination = airportMunicipality(route?.destination)
  if (!origin || !destination) return ''
  if (sameAirport(route.origin, route.destination)) return ''
  return `${origin} -> ${destination}${combinedRouteSuffix(route)}`
}

export const getFlightRouteAccuracyNotice = (route) =>
  normalizedRouteSource(route) === 'adsbdb'
    ? "This route may be inaccurate: adsbdb uses callsign reference data that may not match today's actual origin and destination."
    : ''
