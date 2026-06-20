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
  const responseNowSeconds = 1_700_000_003
  const positionTime = parseAdsbPositionTime({ seen: 2 }, responseNowSeconds)
  assert.equal(positionTime, 1_700_000_001_000)
}

{
  const ac = {
    lat: 33,
    lon: -118,
    onGround: false,
    velocity: 140,
    track: 90,
    positionTime: 0,
  }

  const earlyPosition = calculateAircraftVisualPosition(ac, 2_000)
  const laterPosition = calculateAircraftVisualPosition(ac, 4_000)

  assert.ok(laterPosition.lon > earlyPosition.lon, 'airborne aircraft should keep extrapolating forward between snapshots')
  nearlyEqual(laterPosition.lat, ac.lat)
}

{
  const groundTraffic = {
    lat: 33,
    lon: -118,
    onGround: true,
    velocity: 20,
    track: 0,
    positionTime: 0,
  }

  const earlyPosition = calculateAircraftVisualPosition(groundTraffic, 2_000)
  const laterPosition = calculateAircraftVisualPosition(groundTraffic, 4_000)
  const fastPosition = calculateAircraftVisualPosition({
    ...groundTraffic,
    onGround: false,
    velocity: 100,
  }, 4_000)

  assert.ok(laterPosition.lat > earlyPosition.lat, 'slow aircraft should still move while waiting for the next poll')
  assert.ok(laterPosition.lat < fastPosition.lat, 'slow aircraft should use reduced extrapolation after the short confidence window')
  nearlyEqual(laterPosition.lon, groundTraffic.lon)
}

{
  const overshotVisualPosition = {
    lat: 33.01,
    lon: -118,
  }
  const newSnapshot = {
    lat: 33,
    lon: -118,
    onGround: false,
    velocity: 120,
    track: 0,
    positionTime: 2_000,
  }

  const state = beginAircraftMotionState(newSnapshot, 3_000, overshotVisualPosition)
  const immediate = calculateAircraftVisualPosition(state, 3_000)
  const duringHold = calculateAircraftVisualPosition(state, 3_500)

  nearlyEqual(immediate.lat, overshotVisualPosition.lat)
  nearlyEqual(duringHold.lat, overshotVisualPosition.lat)
  assert.equal(shouldAnimateAircraftVisualPosition(state, 3_500), true)
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
}
