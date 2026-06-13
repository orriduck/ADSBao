import assert from 'node:assert/strict'

import {
  formatFlightRouteLabel,
  formatFlightRouteMunicipalityLabel,
  getFlightRouteAccuracyNotice,
} from './flightRouteDisplay'

{
  const label = formatFlightRouteLabel({
    origin: { iata: 'JFK', icao: 'KJFK' },
    destination: { iata: 'LHR', icao: 'EGLL' },
    source: 'flightaware',
  })

  assert.equal(label, 'JFK -> LHR')
}

{
  const adsbdbRoute = {
    origin: { iata: 'BOS', icao: 'KBOS', municipality: 'Boston' },
    destination: { iata: 'SFO', icao: 'KSFO', municipality: 'San Francisco' },
    source: 'adsbdb',
  }

  assert.equal(formatFlightRouteLabel(adsbdbRoute), 'BOS -> SFO*')
  assert.equal(
    formatFlightRouteMunicipalityLabel(adsbdbRoute),
    'Boston -> San Francisco*',
  )
  assert.ok(getFlightRouteAccuracyNotice(adsbdbRoute).includes('adsbdb'))
}

{
  const flightAwareRoute = {
    origin: { iata: 'BOS', icao: 'KBOS' },
    destination: { iata: 'SFO', icao: 'KSFO' },
    source: 'flightaware',
  }

  assert.equal(formatFlightRouteLabel(flightAwareRoute), 'BOS -> SFO')
  assert.equal(getFlightRouteAccuracyNotice(flightAwareRoute), '')
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
}
