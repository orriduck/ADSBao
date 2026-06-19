import assert from 'node:assert/strict'

import {
  beginAircraftMotionState,
  calculateAircraftVisualPosition,
  parseAdsbPositionTime,
  shouldAnimateAircraftVisualPosition,
} from './aircraftMotion'

const nearlyEqual = (actual, expected, tolerance = 1e-8) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  )
}

{
  const responseNow = 1_700_000_003_000
  const positionTime = parseAdsbPositionTime({ seen_pos: 1.25 }, responseNow, 1_700_000_003_200)
  assert.equal(positionTime, 1_700_000_001_750)
}

{
  const ac = {
    lat: 33,
    lon: -118,
    onGround: true,
    velocity: 20,
    track: 0,
    positionTime: 0,
  }

  const earlyPosition = calculateAircraftVisualPosition(ac, 1_500)
  const laterPosition = calculateAircraftVisualPosition(ac, 3_000)
  const fullSpeedPosition = calculateAircraftVisualPosition({
    ...ac,
    velocity: 100,
  }, 3_000)

  assert.ok(laterPosition.lat > earlyPosition.lat, 'slow aircraft should keep moving while waiting for the next poll')
  assert.ok(laterPosition.lat < fullSpeedPosition.lat, 'slow aircraft should use reduced extrapolation after the short confidence window')
  nearlyEqual(laterPosition.lon, ac.lon)
}

{
  const staleVisualPosition = calculateAircraftVisualPosition({
    lat: 33,
    lon: -118,
    velocity: 80,
    track: 0,
    positionTime: 0,
  }, 3_000)

  const newSnapshot = {
    lat: 33.0005,
    lon: -118,
    onGround: true,
    velocity: 12,
    track: 0,
    positionTime: 2_500,
  }

  const state = beginAircraftMotionState(newSnapshot, 3_000, staleVisualPosition)
  const immediate = calculateAircraftVisualPosition(state, 3_000)
  const settled = calculateAircraftVisualPosition(state, 3_900)
  const target = calculateAircraftVisualPosition(newSnapshot, 3_900)

  nearlyEqual(immediate.lat, staleVisualPosition.lat)
  assert.ok(settled.lat < immediate.lat, 'settled correction should move back from the stale prediction')
  nearlyEqual(settled.lat, target.lat)
}

{
  assert.equal(
    shouldAnimateAircraftVisualPosition({
      lat: 33,
      lon: -118,
      velocity: 0,
      positionTime: 0,
    }, 3_000),
    false,
  )

  assert.equal(
    shouldAnimateAircraftVisualPosition({
      lat: 33,
      lon: -118,
      velocity: 120,
      track: 90,
      positionTime: 1_000,
    }, 3_000),
    true,
  )

  assert.equal(
    shouldAnimateAircraftVisualPosition({
      lat: 33,
      lon: -118,
      velocity: 120,
      track: 90,
      positionTime: 1_000,
    }, 40_000),
    false,
  )

  const correcting = beginAircraftMotionState({
    lat: 33,
    lon: -118,
    velocity: 0,
    positionTime: 1_000,
  }, 3_000, { lat: 33.1, lon: -118 })

  assert.equal(shouldAnimateAircraftVisualPosition(correcting, 3_300), true)
  assert.equal(shouldAnimateAircraftVisualPosition(correcting, 4_000), false)
}
