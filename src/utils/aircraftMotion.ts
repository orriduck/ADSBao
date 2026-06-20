import { toFiniteNumber } from './math'

const KT_TO_MPS = 0.514444
const METERS_PER_DEGREE_LAT = 111_320

const VISUAL_DELAY_MS = 1_000
const CORRECTION_DURATION_MS = 750
export const SLOW_AIRCRAFT_THRESHOLD_KT = 30
const CRUISE_SPEED_THRESHOLD_KT = 100
const FAST_EXTRAPOLATION_LIMIT_MS = 4_000
const CRUISE_EXTRAPOLATION_LIMIT_MS = 30_000
const SLOW_FULL_SPEED_WINDOW_MS = 500
const SLOW_EXTRAPOLATION_SCALE = 0.25
const OVERSHOT_HOLD_LIMIT_MS = 3_000
const REVERSE_CORRECTION_MIN_METERS = 8

const normalizeEpochMs = (value) => {
  const number = toFiniteNumber(value)
  if (number == null) return null
  return number < 10_000_000_000 ? Math.round(number * 1000) : Math.round(number)
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

export const parseAdsbPositionTime = (aircraft, responseNow, receiveTime = Date.now()) => {
  const serverNow = normalizeEpochMs(responseNow) ?? normalizeEpochMs(receiveTime) ?? Date.now()
  const ageSeconds = toFiniteNumber(aircraft?.seen_pos ?? aircraft?.seen)
  if (ageSeconds == null) return serverNow
  return serverNow - Math.max(0, ageSeconds) * 1000
}

const getAircraftExtrapolationLimitMs = (aircraft) => {
  const velocity = Math.max(0, toFiniteNumber(aircraft?.velocity) ?? 0)
  if (aircraft?.onGround || velocity < SLOW_AIRCRAFT_THRESHOLD_KT) return FAST_EXTRAPOLATION_LIMIT_MS
  if (velocity >= CRUISE_SPEED_THRESHOLD_KT) return CRUISE_EXTRAPOLATION_LIMIT_MS
  return FAST_EXTRAPOLATION_LIMIT_MS
}

const getEffectiveElapsedMs = (aircraft, elapsedMs) => {
  const boundedElapsedMs = clamp(elapsedMs, 0, getAircraftExtrapolationLimitMs(aircraft))
  const velocity = Math.max(0, toFiniteNumber(aircraft?.velocity) ?? 0)
  const isSlow = aircraft?.onGround || velocity < SLOW_AIRCRAFT_THRESHOLD_KT

  if (!isSlow || boundedElapsedMs <= SLOW_FULL_SPEED_WINDOW_MS) return boundedElapsedMs

  return SLOW_FULL_SPEED_WINDOW_MS
    + (boundedElapsedMs - SLOW_FULL_SPEED_WINDOW_MS) * SLOW_EXTRAPOLATION_SCALE
}

const projectAircraftPosition = (aircraft, elapsedMs) => {
  const lat = toFiniteNumber(aircraft?.lat) ?? 0
  const lon = toFiniteNumber(aircraft?.lon) ?? 0
  const velocity = Math.max(0, toFiniteNumber(aircraft?.velocity) ?? 0)
  const track = toFiniteNumber(aircraft?.track) ?? 0
  const elapsedSeconds = Math.max(0, elapsedMs) / 1000

  if (!velocity || !elapsedSeconds) return { lat, lon }

  const mps = velocity * KT_TO_MPS
  const trackRad = (track * Math.PI) / 180
  const latRad = (lat * Math.PI) / 180
  const dLat = (mps * Math.cos(trackRad) * elapsedSeconds) / METERS_PER_DEGREE_LAT
  const lonDivisor = METERS_PER_DEGREE_LAT * Math.cos(latRad)
  const dLon = lonDivisor === 0 ? 0 : (mps * Math.sin(trackRad) * elapsedSeconds) / lonDivisor

  return { lat: lat + dLat, lon: lon + dLon }
}

const targetPositionForTime = (state, nowMs) => {
  const positionTime = toFiniteNumber(state.positionTime) ?? nowMs
  const renderTime = nowMs - VISUAL_DELAY_MS
  const elapsedMs = getEffectiveElapsedMs(state, renderTime - positionTime)
  return projectAircraftPosition(state, elapsedMs)
}

const metersFromTo = (from, to) => {
  const fromLat = toFiniteNumber(from?.lat)
  const fromLon = toFiniteNumber(from?.lon)
  const toLat = toFiniteNumber(to?.lat)
  const toLon = toFiniteNumber(to?.lon)
  if (fromLat == null || fromLon == null || toLat == null || toLon == null) {
    return null
  }

  const avgLatRad = (((fromLat + toLat) / 2) * Math.PI) / 180
  return {
    north: (toLat - fromLat) * METERS_PER_DEGREE_LAT,
    east: (toLon - fromLon) * METERS_PER_DEGREE_LAT * Math.cos(avgLatRad),
  }
}

const forwardMetersFromTo = (from, to, track) => {
  const delta = metersFromTo(from, to)
  const normalizedTrack = toFiniteNumber(track)
  if (!delta || normalizedTrack == null) return 0

  const trackRad = (normalizedTrack * Math.PI) / 180
  return delta.north * Math.cos(trackRad) + delta.east * Math.sin(trackRad)
}

const shouldHoldOvershotVisualPosition = ({ aircraft, current, target }) => {
  const velocityMps = Math.max(0, toFiniteNumber(aircraft?.velocity) ?? 0) * KT_TO_MPS
  if (velocityMps <= 0) return false

  const currentAheadMeters = forwardMetersFromTo(target, current, aircraft?.track)
  if (currentAheadMeters <= REVERSE_CORRECTION_MIN_METERS) return false

  const correctionMetersPerSecond =
    currentAheadMeters / (CORRECTION_DURATION_MS / 1000)
  return correctionMetersPerSecond > velocityMps * 0.8
}

export const beginAircraftMotionState = (
  aircraft,
  nowMs = Date.now(),
  currentVisualPosition = null,
) => {
  const target = targetPositionForTime(aircraft, nowMs)
  const current = currentVisualPosition ?? target
  const holdOvershotVisualPosition = Boolean(
    currentVisualPosition &&
      shouldHoldOvershotVisualPosition({ aircraft, current, target }),
  )

  return {
    ...aircraft,
    correctionLat: holdOvershotVisualPosition ? 0 : current.lat - target.lat,
    correctionLon: holdOvershotVisualPosition ? 0 : current.lon - target.lon,
    correctionStartTime: nowMs,
    holdLat: holdOvershotVisualPosition ? current.lat : null,
    holdLon: holdOvershotVisualPosition ? current.lon : null,
    holdStartTime: holdOvershotVisualPosition ? nowMs : null,
  }
}

export const calculateAircraftVisualPosition = (state, nowMs = Date.now()) => {
  const target = targetPositionForTime(state, nowMs)
  const holdLat = toFiniteNumber(state?.holdLat)
  const holdLon = toFiniteNumber(state?.holdLon)
  const holdStartTime = toFiniteNumber(state?.holdStartTime)

  if (holdLat != null && holdLon != null && holdStartTime != null) {
    const hold = { lat: holdLat, lon: holdLon }
    const targetHasCaughtUp =
      forwardMetersFromTo(hold, target, state?.track) >= 0
    const holdExpired = nowMs - holdStartTime >= OVERSHOT_HOLD_LIMIT_MS
    if (!targetHasCaughtUp && !holdExpired) return hold
  }

  const correctionStartTime = toFiniteNumber(state.correctionStartTime)

  if (correctionStartTime == null) return target

  const progress = clamp((nowMs - correctionStartTime) / CORRECTION_DURATION_MS, 0, 1)
  const remaining = 1 - progress
  return {
    lat: target.lat + (toFiniteNumber(state.correctionLat) ?? 0) * remaining,
    lon: target.lon + (toFiniteNumber(state.correctionLon) ?? 0) * remaining,
  }
}

export const shouldAnimateAircraftVisualPosition = (state, nowMs = Date.now()) => {
  if (!state) return false

  const holdStartTime = toFiniteNumber(state?.holdStartTime)
  if (
    holdStartTime != null &&
    nowMs - holdStartTime < OVERSHOT_HOLD_LIMIT_MS
  ) {
    const holdLat = toFiniteNumber(state?.holdLat)
    const holdLon = toFiniteNumber(state?.holdLon)
    if (holdLat != null && holdLon != null) {
      const target = targetPositionForTime(state, nowMs)
      if (forwardMetersFromTo({ lat: holdLat, lon: holdLon }, target, state?.track) < 0) {
        return true
      }
    }
  }

  const correctionStartTime = toFiniteNumber(state.correctionStartTime)
  if (
    correctionStartTime != null &&
    nowMs - correctionStartTime < CORRECTION_DURATION_MS
  ) {
    return true
  }

  const velocity = Math.max(0, toFiniteNumber(state?.velocity) ?? 0)
  const positionTime = toFiniteNumber(state?.positionTime)
  if (!velocity || positionTime == null) return false

  const renderTime = nowMs - VISUAL_DELAY_MS
  const elapsedMs = renderTime - positionTime
  return elapsedMs < getAircraftExtrapolationLimitMs(state)
}
