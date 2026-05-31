import { toFiniteNumber } from './math'

const EARTH_RADIUS_NM = 3440.065
const MIN_SAMPLE_SPAN_MS = 2_000
const MIN_DISTANCE_DELTA_NM = 0.08
const MIN_ALTITUDE_DELTA_FT = 75

const toRadians = (degrees) => (degrees * Math.PI) / 180

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

const classifyConfidence = (distanceDeltaNm, altitudeDeltaFt) => {
  const distanceConfidence = Math.min(Math.abs(distanceDeltaNm) / 2.5, 0.75)
  const altitudeConfidence = altitudeDeltaFt == null
    ? 0
    : Math.min(Math.abs(altitudeDeltaFt) / 2_000, 0.25)
  return Math.round((0.2 + distanceConfidence + altitudeConfidence) * 100) / 100
}

export const inferAircraftTrafficIntent = (previousSample, currentSample) => {
  const previousDistance = toFiniteNumber(previousSample?.distanceNm)
  const currentDistance = toFiniteNumber(currentSample?.distanceNm)
  const previousTime = toFiniteNumber(previousSample?.time)
  const currentTime = toFiniteNumber(currentSample?.time)

  if (
    previousDistance == null
    || currentDistance == null
    || previousTime == null
    || currentTime == null
    || currentTime - previousTime < MIN_SAMPLE_SPAN_MS
  ) {
    return { state: 'unknown', confidence: 0 }
  }

  const distanceDelta = currentDistance - previousDistance
  if (Math.abs(distanceDelta) < MIN_DISTANCE_DELTA_NM) {
    return { state: 'unknown', confidence: 0 }
  }

  const previousAltitude = toFiniteNumber(previousSample?.altitude)
  const currentAltitude = toFiniteNumber(currentSample?.altitude)
  const altitudeDelta = previousAltitude == null || currentAltitude == null
    ? null
    : currentAltitude - previousAltitude
  const hasAltitudeSignal = altitudeDelta != null && Math.abs(altitudeDelta) >= MIN_ALTITUDE_DELTA_FT

  if (distanceDelta < 0 && hasAltitudeSignal && altitudeDelta < 0) {
    return {
      state: 'arrival',
      confidence: classifyConfidence(distanceDelta, altitudeDelta),
    }
  }

  const groundLaunch = previousSample?.onGround && !currentSample?.onGround
  if (distanceDelta > 0 && (groundLaunch || (hasAltitudeSignal && altitudeDelta > 0))) {
    return {
      state: 'departure',
      confidence: classifyConfidence(distanceDelta, altitudeDelta),
    }
  }

  return { state: 'unknown', confidence: 0 }
}

export const createAircraftIntentTracker = ({
  maxSamples = 5,
  maxAgeMs = 18_000,
} = {}) => {
  const histories = new Map()

  const update = (aircraft, airport, nowMs = Date.now()) => {
    const airportLat = toFiniteNumber(airport?.lat)
    const airportLon = toFiniteNumber(airport?.lon)
    const activeIds = new Set()

    const enriched = aircraft.map((item) => {
      const id = item.icao24 || item.callsign
      const distanceNm = getDistanceNm(item.lat, item.lon, airportLat, airportLon)
      if (!id || distanceNm == null) {
        return { ...item, distanceNm, trafficIntent: 'unknown', trafficIntentConfidence: 0 }
      }

      activeIds.add(id)
      const sample = {
        time: nowMs,
        lat: item.lat,
        lon: item.lon,
        altitude: item.altitude,
        velocity: item.velocity,
        onGround: item.onGround,
        distanceNm,
      }
      const history = (histories.get(id) || [])
        .filter((entry) => nowMs - entry.time <= maxAgeMs)
      history.push(sample)
      histories.set(id, history.slice(-maxSamples))

      const baseline = histories.get(id)[0]
      const intent = inferAircraftTrafficIntent(baseline, sample)

      return {
        ...item,
        distanceNm,
        trafficIntent: intent.state,
        trafficIntentConfidence: intent.confidence,
      }
    })

    for (const id of histories.keys()) {
      if (!activeIds.has(id)) histories.delete(id)
    }

    return enriched
  }

  const clear = () => histories.clear()

  return { update, clear }
}
