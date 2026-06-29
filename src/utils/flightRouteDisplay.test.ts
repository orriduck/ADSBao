import assert from 'node:assert/strict'

import {
  formatFlightRouteLabel,
  formatFlightRouteMunicipalityLabel,
  formatRoutePlaceLabel,
  getFlightRouteAccuracyNotice,
  getFlightRouteEndpointIcaos,
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

// The `*` marker is reserved for adsbdb accuracy warnings; legacy
// displaySuffix values from other route sources are not rendered as route
// accuracy markers.
{
  const communityRoute = {
    origin: { iata: 'JFK', icao: 'KJFK', municipality: 'New York' },
    destination: { iata: 'BOS', icao: 'KBOS', municipality: 'Boston' },
    source: 'community-feedback',
    displaySuffix: '*',
    temporary: true,
  }
  assert.equal(formatFlightRouteLabel(communityRoute), 'JFK -> BOS')
  assert.equal(
    formatFlightRouteMunicipalityLabel(communityRoute),
    'New York -> Boston',
  )
}

// formatRoutePlaceLabel: country flag + city for the carousel's place face.
assert.equal(
  formatRoutePlaceLabel({ city: 'Boston', countryCode: 'US' }),
  '🇺🇸 Boston',
)
assert.equal(
  formatRoutePlaceLabel({ city: 'London', countryCode: 'GB' }),
  '🇬🇧 London',
)
// No / invalid country code → bare city, no flag.
assert.equal(formatRoutePlaceLabel({ city: 'Boston' }), 'Boston')
assert.equal(formatRoutePlaceLabel({ city: 'Boston', countryCode: 'XX?' }), 'Boston')
// No city → empty (caller keeps the static IATA face).
assert.equal(formatRoutePlaceLabel({ countryCode: 'US' }), '')
assert.equal(formatRoutePlaceLabel({}), '')
assert.equal(formatRoutePlaceLabel(), '')

// getFlightRouteEndpointIcaos: ICAO per endpoint for the city lookup; ICAO-first
// with IATA fallback, empty pair when missing, same airport, or no route.
{
  const icaos = getFlightRouteEndpointIcaos({
    origin: { iata: 'BOS', icao: 'KBOS' },
    destination: { iata: 'LAX', icao: 'KLAX' },
  })
  assert.deepEqual(icaos, { origin: 'KBOS', destination: 'KLAX' })
}

{
  // ICAO missing on one side falls back to its IATA code.
  const icaos = getFlightRouteEndpointIcaos({
    origin: { icao: 'KBOS' },
    destination: { iata: 'LAX' },
  })
  assert.deepEqual(icaos, { origin: 'KBOS', destination: 'LAX' })
}

{
  // No identifier on either side → empty pair.
  assert.deepEqual(
    getFlightRouteEndpointIcaos({
      origin: {},
      destination: { icao: 'KLAX' },
    }),
    { origin: '', destination: '' },
  )
  assert.deepEqual(getFlightRouteEndpointIcaos(null), { origin: '', destination: '' })
}

{
  // Same airport (circular) → empty pair.
  assert.deepEqual(
    getFlightRouteEndpointIcaos({
      origin: { icao: 'KBOS' },
      destination: { icao: 'KBOS' },
    }),
    { origin: '', destination: '' },
  )
}
