import assert from 'node:assert/strict'

import {
  formatFlightRouteLabel,
  formatFlightRouteMunicipalityLabel,
  formatFlightNumberLabel,
  formatLocalFlightRouteLabel,
} from './flightRouteDisplay'
import { ARRIVAL, DEPARTURE, UNKNOWN } from './aircraftMovement'

{
  const label = formatFlightRouteLabel({
    origin: { iata: 'JFK', icao: 'KJFK' },
    destination: { iata: 'LHR', icao: 'EGLL' },
  })

  assert.equal(label, 'JFK -> LHR')
}

{
  const label = formatFlightRouteLabel({
    origin: { icao: 'KBOS' },
    destination: { icao: 'KSFO' },
  })

  assert.equal(label, 'KBOS -> KSFO')
}

{
  const label = formatFlightRouteMunicipalityLabel({
    origin: {
      iata: 'FCO',
      icao: 'LIRF',
      name: 'Leonardo Da Vinci (Fiumicino) International Airport',
      municipality: 'Rome',
    },
    destination: {
      iata: 'AMS',
      icao: 'EHAM',
      name: 'Amsterdam Airport Schiphol',
      municipality: 'Amsterdam',
    },
  })

  assert.equal(label, 'Rome -> Amsterdam')
}

{
  assert.equal(
    formatFlightRouteMunicipalityLabel({
      origin: { iata: 'BOS', icao: 'KBOS', name: 'Boston Logan' },
      destination: { iata: 'LHR', icao: 'EGLL', name: 'Heathrow Airport' },
    }),
    'BOS -> LHR',
  )
}

{
  assert.equal(formatFlightRouteLabel(null), '')
  assert.equal(formatFlightRouteLabel({ origin: { iata: 'BOS' } }), '')
  assert.equal(formatFlightRouteMunicipalityLabel(null), '')
}

{
  assert.equal(
    formatFlightNumberLabel({ callsignIata: 'AA873', callsignIcao: 'AAL873' }),
    '873',
  )
  assert.equal(
    formatFlightNumberLabel({ callsignIcao: 'DAL1234' }),
    '1234',
  )
  assert.equal(formatFlightNumberLabel(null, 'JBU456'), '456')
  assert.equal(formatFlightNumberLabel(null, 'N156QX'), '')
}

{
  assert.equal(
    formatFlightRouteLabel({
      origin: { iata: 'BOS', icao: 'KBOS' },
      destination: { iata: 'BOS', icao: 'KBOS' },
    }),
    '',
  )
  assert.equal(
    formatFlightRouteMunicipalityLabel({
      origin: { iata: 'BOS', icao: 'KBOS', municipality: 'Boston' },
      destination: { iata: 'BOS', icao: 'KBOS', municipality: 'Boston' },
    }),
    '',
  )
}

{
  const route = {
    origin: { iata: 'LAX', icao: 'KLAX' },
    destination: { iata: 'BOS', icao: 'KBOS' },
  }

  assert.equal(
    formatLocalFlightRouteLabel(route, { iata: 'BOS', icao: 'KBOS' }, ARRIVAL),
    'LAX -> BOS',
  )
  assert.equal(
    formatLocalFlightRouteLabel(route, { iata: 'BOS', icao: 'KBOS' }, DEPARTURE),
    '',
  )
}

{
  const route = {
    origin: { iata: 'BOS', icao: 'KBOS' },
    destination: { iata: 'ATL', icao: 'KATL' },
  }

  assert.equal(
    formatLocalFlightRouteLabel(route, { iata: 'BOS', icao: 'KBOS' }, DEPARTURE),
    'BOS -> ATL',
  )
  assert.equal(
    formatLocalFlightRouteLabel(route, { iata: 'BOS', icao: 'KBOS' }, ARRIVAL),
    '',
  )
}

{
  const route = {
    origin: { iata: 'PHX', icao: 'KPHX' },
    destination: { iata: 'MIA', icao: 'KMIA' },
  }

  assert.equal(
    formatLocalFlightRouteLabel(route, { iata: 'BOS', icao: 'KBOS' }, UNKNOWN),
    '',
  )
}

{
  const route = {
    origin: { iata: 'BOS', icao: 'KBOS' },
    destination: { iata: 'BOS', icao: 'KBOS' },
  }

  assert.equal(
    formatLocalFlightRouteLabel(route, { iata: 'BOS', icao: 'KBOS' }, UNKNOWN),
    '',
  )
}

// Community-feedback routes are displayed with their `*` suffix on the
// route label only (callsign stays clean). Both the ICAO-coded and
// municipality variants carry the suffix so the sidebar and the preview
// card agree.
{
  const communityRoute = {
    origin: { iata: 'JFK', icao: 'KJFK', municipality: 'New York' },
    destination: { iata: 'BOS', icao: 'KBOS', municipality: 'Boston' },
    displaySuffix: '*',
    temporary: true,
  }
  assert.equal(formatFlightRouteLabel(communityRoute), 'JFK -> BOS*')
  assert.equal(
    formatFlightRouteMunicipalityLabel(communityRoute),
    'New York -> Boston*',
  )
  assert.equal(
    formatLocalFlightRouteLabel(
      communityRoute,
      { iata: 'BOS', icao: 'KBOS' },
      ARRIVAL,
    ),
    'JFK -> BOS*',
  )
}
