import { toFiniteNumber, toRadians } from './math'

const EARTH_RADIUS_NM = 3440.065

export const getDistanceNm = (fromLat, fromLon, toLat, toLon) => {
  const lat1 = toFiniteNumber(fromLat)
  const lon1 = toFiniteNumber(fromLon)
  const lat2 = toFiniteNumber(toLat)
  const lon2 = toFiniteNumber(toLon)
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null

  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const rLat1 = toRadians(lat1)
  const rLat2 = toRadians(lat2)
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.sqrt(a))
}
