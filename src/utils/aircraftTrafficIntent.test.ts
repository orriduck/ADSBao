import assert from 'node:assert/strict'

import { getDistanceNm } from './aircraftTrafficIntent'

const airport = { lat: 42.3656, lon: -71.0096 }

assert.equal(getDistanceNm(undefined, airport.lon, airport.lat, airport.lon), null)
assert.equal(getDistanceNm(airport.lat, airport.lon, undefined, airport.lon), null)

const shortHopNm = getDistanceNm(airport.lat, airport.lon, 42.45, -71.04)
assert.ok(shortHopNm != null && shortHopNm > 4 && shortHopNm < 6)

const samePointNm = getDistanceNm(airport.lat, airport.lon, airport.lat, airport.lon)
assert.equal(samePointNm, 0)
