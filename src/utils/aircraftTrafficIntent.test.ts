import assert from 'node:assert/strict'

import {
  createAircraftIntentTracker,
  inferAircraftTrafficIntent,
} from './aircraftTrafficIntent'

const airport = { lat: 42.3656, lon: -71.0096 }

{
  const intent = inferAircraftTrafficIntent(
    { time: 0, lat: 42.60, lon: -71.10, altitude: 5_000, distanceNm: 14 },
    { time: 9_000, lat: 42.40, lon: -71.03, altitude: 2_400, distanceNm: 3 },
  )

  assert.equal(intent.state, 'arrival')
  assert.ok(intent.confidence > 0.5)
}

{
  const intent = inferAircraftTrafficIntent(
    { time: 0, lat: 42.36, lon: -71.02, altitude: 300, onGround: true, distanceNm: 0.5 },
    { time: 9_000, lat: 42.48, lon: -70.92, altitude: 3_200, velocity: 190, distanceNm: 9 },
  )

  assert.equal(intent.state, 'departure')
  assert.ok(intent.confidence > 0.5)
}

{
  const intent = inferAircraftTrafficIntent(
    { time: 0, lat: 42.50, lon: -71.10, altitude: 6_000, distanceNm: 8 },
    { time: 9_000, lat: 42.44, lon: -71.06, altitude: 6_300, distanceNm: 5 },
  )

  assert.equal(intent.state, 'unknown')
  assert.equal(intent.confidence, 0)
}

{
  const intent = inferAircraftTrafficIntent(
    { time: 0, lat: 42.60, lon: -71.10, distanceNm: 14 },
    { time: 9_000, lat: 42.40, lon: -71.03, distanceNm: 3 },
  )

  assert.equal(intent.state, 'unknown')
}

{
  const tracker = createAircraftIntentTracker({ maxSamples: 3, maxAgeMs: 20_000 })
  let [aircraft] = tracker.update([
    { icao24: 'a1', lat: 42.60, lon: -71.10, altitude: 5_000, velocity: 180 },
  ], airport, 1_000)

  assert.equal(aircraft.trafficIntent, 'unknown')

  ;[aircraft] = tracker.update([
    { icao24: 'a1', lat: 42.45, lon: -71.04, altitude: 3_000, velocity: 170 },
  ], airport, 7_000)

  assert.equal(aircraft.trafficIntent, 'arrival')
  assert.ok(aircraft.distanceNm < 6)
}
