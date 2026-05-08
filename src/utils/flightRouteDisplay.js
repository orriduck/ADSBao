import { ARRIVAL, DEPARTURE } from './aircraftMovement.js'

const airportCode = (airport) =>
  String(airport?.iata || airport?.icao || '').trim().toUpperCase()

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

export const formatFlightNumberLabel = (route, fallbackCallsign = '') =>
  flightNumberFromIdent(route?.callsignIata)
  || flightNumberFromIdent(route?.callsignIcao)
  || flightNumberFromIdent(route?.callsign)
  || flightNumberFromIdent(fallbackCallsign)

export const formatFlightRouteLabel = (route) => {
  const origin = airportCode(route?.origin)
  const destination = airportCode(route?.destination)
  if (origin && destination && sameAirport(route.origin, route.destination)) {
    return ''
  }
  return origin && destination ? `${origin} -> ${destination}` : ''
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
