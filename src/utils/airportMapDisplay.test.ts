import assert from 'node:assert/strict'

import {
  countGroundAircraft,
  isGroundLikeAircraft,
} from './airportMapDisplay'

assert.equal(
  countGroundAircraft([
    { onGround: true },
    { onGround: false },
    { onGround: true },
    {},
  ]),
  2,
)

const groundLikeOptions = {
  airportAreaRadiusNm: 2.2,
  slowAircraftThresholdKt: 30,
}

assert.equal(
  isGroundLikeAircraft(
    { distanceNm: 0.8, velocity: 0, altitude: 'ground' },
    groundLikeOptions,
  ),
  true,
)
assert.equal(
  isGroundLikeAircraft(
    { distanceNm: 2.1, velocity: 29.9, altitude: 12000 },
    groundLikeOptions,
  ),
  true,
)
assert.equal(
  isGroundLikeAircraft(
    { distanceNm: 2.3, velocity: 0 },
    groundLikeOptions,
  ),
  false,
)
assert.equal(
  isGroundLikeAircraft(
    { distanceNm: 0.8, velocity: 30 },
    groundLikeOptions,
  ),
  false,
)
assert.equal(
  isGroundLikeAircraft(
    { onGround: true, distanceNm: 8, velocity: 220 },
    groundLikeOptions,
  ),
  true,
)
