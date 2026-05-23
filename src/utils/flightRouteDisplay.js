import { ARRIVAL, DEPARTURE } from './aircraftMovement.js'
export { getFlightRouteAirlineIconUrl } from '../features/aviation/airlineLogoModel.js'

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

const airportMatches = (routeAirport, airport) => {
  const localCodes = airportCodes(airport)
  return [routeAirport?.iata, routeAirport?.icao]
    .map((code) => String(code || '').trim().toUpperCase())
    .some((code) => localCodes.has(code))
}

const sameAirport = (a, b) => {
  const aCodes = airportCodes(a)
  const bCodes = airportCodes(b)
  return [...aCodes].some((code) => bCodes.has(code))
}

const flightNumberFromIdent = (ident) => {
  const match = String(ident || '').trim().toUpperCase().match(/^[A-Z]{2,3}(\d{1,5}[A-Z]?)$/)
  return match?.[1] || ''
}

// Community-feedback routes carry a `displaySuffix` (currently "*") so the
// renderer can mark them as user-supplied at a glance. Suffix only attaches
// when we *have* a renderable route — an empty label stays empty.
const routeDisplaySuffix = (route) =>
  String(route?.displaySuffix || '').trim()

export const formatFlightNumberLabel = (route, fallbackCallsign = '') =>
  flightNumberFromIdent(route?.callsignIata)
  || flightNumberFromIdent(route?.callsignIcao)
  || flightNumberFromIdent(route?.callsign)
  || flightNumberFromIdent(fallbackCallsign)

export const formatFlightRouteLabel = (route) => {
  const origin = airportCode(route?.origin)
  const destination = airportCode(route?.destination)
  if (!origin || !destination) return ''
  if (sameAirport(route.origin, route.destination)) return ''
  return `${origin} -> ${destination}${routeDisplaySuffix(route)}`
}

export const formatFlightRouteMunicipalityLabel = (route) => {
  const origin = airportMunicipality(route?.origin)
  const destination = airportMunicipality(route?.destination)
  if (!origin || !destination) return ''
  if (sameAirport(route.origin, route.destination)) return ''
  return `${origin} -> ${destination}${routeDisplaySuffix(route)}`
}

export const formatLocalFlightRouteLabel = (route, airport, movement) => {
  if (!route || !airport) return ''

  if (movement === ARRIVAL && !airportMatches(route.destination, airport)) {
    return ''
  }

  if (movement === DEPARTURE && !airportMatches(route.origin, airport)) {
    return ''
  }

  if (
    movement !== ARRIVAL
    && movement !== DEPARTURE
    && !airportMatches(route.origin, airport)
    && !airportMatches(route.destination, airport)
  ) {
    return ''
  }

  return formatFlightRouteLabel(route)
}
