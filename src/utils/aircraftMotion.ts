import { toFiniteNumber } from './math'

export const SLOW_AIRCRAFT_THRESHOLD_KT = 30

const normalizeEpochMs = (value) => {
  const number = toFiniteNumber(value)
  if (number == null) return null
  return number < 10_000_000_000 ? Math.round(number * 1000) : Math.round(number)
}

export const parseAdsbPositionTime = (aircraft, responseNow, receiveTime = Date.now()) => {
  const serverNow = normalizeEpochMs(responseNow) ?? normalizeEpochMs(receiveTime) ?? Date.now()
  const ageSeconds = toFiniteNumber(aircraft?.seen_pos ?? aircraft?.seen)
  if (ageSeconds == null) return serverNow
  return serverNow - Math.max(0, ageSeconds) * 1000
}
