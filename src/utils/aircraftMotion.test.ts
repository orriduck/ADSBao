import assert from 'node:assert/strict'

import {
  beginAircraftMotionState,
  calculateAircraftVisualPosition,
  parseAdsbPositionTime,
  peekAircraftDisplayedPosition,
  shouldAnimateAircraftVisualPosition,
  tauForZoom,
  POSITION_SMOOTHING,
} from './aircraftMotion'

const nearlyEqual = (actual, expected, tolerance = 1e-8) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  )
}

const metersBetween = (a, b) => {
  const M = 111_320
  const avg = (((a.lat + b.lat) / 2) * Math.PI) / 180
  return Math.hypot((b.lat - a.lat) * M, (b.lon - a.lon) * M * Math.cos(avg))
}

// --- fix timestamp from position age (unchanged contract) ---------------------
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

// --- smoothstep gate: below LOW_KT the target IS the raw fix (no drift) --------
{
  const slow = { lat: 33, lon: -118, velocity: 5, track: 90, onGround: false, positionTime: 0 }
  const state = beginAircraftMotionState(slow, 0)
  for (let t = 100; t <= 4000; t += 100) calculateAircraftVisualPosition(state, t, 10)
  // velocity 5kt < LOW_KT 8 -> k=0 -> displayed never extrapolates off the fix.
  nearlyEqual(state.dispLat, 33, 1e-5)
  nearlyEqual(state.dispLon, -118, 1e-5)
}

// --- ground traffic is never dead-reckoned ------------------------------------
{
  const taxi = { lat: 33, lon: -118, velocity: 18, track: 90, onGround: true, positionTime: 0 }
  const state = beginAircraftMotionState(taxi, 0)
  for (let t = 100; t <= 4000; t += 100) calculateAircraftVisualPosition(state, t, 13)
  nearlyEqual(state.dispLon, -118, 1e-5) // onGround -> k=0 despite gs>LOW_KT
}

// --- fast aircraft extrapolate forward along track ----------------------------
{
  const fast = { lat: 33, lon: -118, velocity: 200, track: 90, onGround: false, positionTime: 0 }
  const state = beginAircraftMotionState(fast, 0)
  for (let t = 100; t <= 3000; t += 100) calculateAircraftVisualPosition(state, t, 14)
  assert.ok(state.dispLon > -118, 'eastbound fast aircraft should extrapolate east')
  nearlyEqual(state.dispLat, 33, 1e-4)
}

// --- frame-rate independence: one big step == many small steps (static target) -
{
  const ac = { lat: 33, lon: -118, velocity: 0, track: 0, onGround: false, positionTime: 0 }
  const a = beginAircraftMotionState(ac, 0, { lat: 33.1, lon: -118 })
  const b = beginAircraftMotionState(ac, 0, { lat: 33.1, lon: -118 })
  calculateAircraftVisualPosition(a, 1000, 13) // single 1000ms frame
  for (let i = 1; i <= 10; i += 1) calculateAircraftVisualPosition(b, i * 100, 13) // 10x100ms
  nearlyEqual(a.dispLat, b.dispLat, 1e-9)
  nearlyEqual(a.dispLon, b.dispLon, 1e-9)
}

// --- a new fix updates only the anchor: the marker never teleports -------------
{
  // Realistic carry-over: the previous displayed position is a couple hundred
  // metres from the new fix (well under the catch-up clamp).
  const ac = { lat: 33, lon: -118, velocity: 0, track: 0, onGround: false, positionTime: 1000 }
  const state = beginAircraftMotionState(ac, 1000, { lat: 33.002, lon: -118 })
  const pos = calculateAircraftVisualPosition(state, 1000, 13) // dtFrame 0 -> no jump
  nearlyEqual(pos.lat, 33.002, 1e-9)
  // peek must not advance the easing.
  const peek = peekAircraftDisplayedPosition(state)
  nearlyEqual(peek.lat, pos.lat)
  nearlyEqual(peek.lon, pos.lon)
}

// --- catch-up clamp bounds the lag on a huge gap ------------------------------
{
  const ac = { lat: 33, lon: -118, velocity: 0, track: 0, onGround: false, positionTime: 0 }
  const state = beginAircraftMotionState(ac, 0, { lat: 33.05, lon: -118 }) // ~5.5km away (well past clamp)
  const pos = calculateAircraftVisualPosition(state, 100, 13) // small frame, low alpha
  const dist = metersBetween(pos, { lat: 33, lon: -118 })
  assert.ok(
    dist < POSITION_SMOOTHING.MAX_CATCHUP_M,
    `clamp should pull within ${POSITION_SMOOTHING.MAX_CATCHUP_M}m, got ${dist.toFixed(0)}m`,
  )
}

// --- shouldAnimate: settles for still targets, runs for moving ones -----------
{
  const settled = { lat: 33, lon: -118, velocity: 0, track: 0, onGround: false, positionTime: 0, dispLat: 33, dispLon: -118, lastStepMs: 0 }
  assert.equal(shouldAnimateAircraftVisualPosition(settled, 3_000), false)

  const moving = beginAircraftMotionState(
    { lat: 33, lon: -118, velocity: 200, track: 90, onGround: false, positionTime: 1_000 },
    1_000,
  )
  assert.equal(shouldAnimateAircraftVisualPosition(moving, 3_000), true)

  // Past the extrapolation cap the target freezes (capped age); once the
  // displayed position converges onto it, animation stops.
  const stale = beginAircraftMotionState(
    { lat: 33, lon: -118, velocity: 200, track: 90, onGround: false, positionTime: 0 },
    0,
  )
  for (let t = 0; t <= 40_000; t += 100) calculateAircraftVisualPosition(stale, t, 14)
  assert.equal(shouldAnimateAircraftVisualPosition(stale, 40_000), false)
}

// --- zoom-adaptive tau --------------------------------------------------------
{
  assert.equal(tauForZoom(14), POSITION_SMOOTHING.TAU_HIGH_S)
  assert.equal(tauForZoom(10), POSITION_SMOOTHING.TAU_MID_S)
  assert.equal(tauForZoom(7), POSITION_SMOOTHING.TAU_FAR_S)
  assert.ok(tauForZoom(14) > tauForZoom(7), 'high zoom should ease more slowly than far zoom')
}
