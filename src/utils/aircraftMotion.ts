import { toFiniteNumber } from './math'

const KT_TO_MPS = 0.514444
const METERS_PER_DEGREE_LAT = 111_320

const VISUAL_DELAY_MS = 750
const CORRECTION_DURATION_MS = 750
export const SLOW_AIRCRAFT_THRESHOLD_KT = 30
const CRUISE_SPEED_THRESHOLD_KT = 100
const FAST_EXTRAPOLATION_LIMIT_MS = 4_000
const CRUISE_EXTRAPOLATION_LIMIT_MS = 30_000
const SLOW_FULL_SPEED_WINDOW_MS = 500
const SLOW_EXTRAPOLATION_SCALE = 0.25

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

export const beginAircraftMotionState = (aircraft, nowMs = Date.now(), currentVisualPosition = null) => {
  const target = targetPositionForTime(aircraft, nowMs)
  const current = currentVisualPosition ?? target

  return {
    ...aircraft,
    correctionLat: current.lat - target.lat,
    correctionLon: current.lon - target.lon,
    correctionStartTime: nowMs,
  }
}

export const calculateAircraftVisualPosition = (state, nowMs = Date.now()) => {
  const target = targetPositionForTime(state, nowMs)
  const correctionStartTime = toFiniteNumber(state.correctionStartTime)

  if (correctionStartTime == null) return target

  const progress = clamp((nowMs - correctionStartTime) / CORRECTION_DURATION_MS, 0, 1)
  const remaining = 1 - progress
  return {
    lat: target.lat + (toFiniteNumber(state.correctionLat) ?? 0) * remaining,
    lon: target.lon + (toFiniteNumber(state.correctionLon) ?? 0) * remaining,
  }
}
