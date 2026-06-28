import { clamp, toFiniteNumber } from './math'

// Adaptive dead-reckoning + critically-damped easing for aircraft markers.
//
// Each ADS-B fix becomes an *anchor* { lat, lon, velocity, track, positionTime }.
// Per frame we project a *target* forward from the anchor along its track, and
// ease the *displayed* position toward that target with a frame-rate-independent
// first-order (critically-damped, never-overshooting) low-pass filter.
//
// Why this shape:
//  - Slow aircraft (taxi / low gs): per-update true displacement is meters — the
//    same order as ADS-B quantization noise. A naive velocity extrapolation pushes
//    the marker the wrong way then snaps back ("drift"). Here `k = smoothstep`
//    gates extrapolation OFF below LOW_KT, so the target IS the raw fix and noise
//    is never amplified forward.
//  - Steady targets: a first-order filter toward a constant/steady target cannot
//    overshoot or oscillate, so steady-state jitter is ~0 at far/mid zoom.
//  - Multi-source offsets and source switches are absorbed by the same easing —
//    no special case — because the displayed position low-passes anchor changes.
//  - New fixes update ONLY the anchor; the displayed position carries over, so a
//    marker never teleports.

const KT_TO_MPS = 0.514444
const METERS_PER_DEGREE_LAT = 111_320

// Slow/fast boundary used by the canvas model (heading arrow visibility). Kept
// as the historical 30kt so unrelated UI is unchanged.
export const SLOW_AIRCRAFT_THRESHOLD_KT = 30

// The single named tuning block. Do not scatter these as magic numbers.
export const POSITION_SMOOTHING = {
  // smoothstep gate on extrapolation: below LOW_KT the target collapses to the
  // raw fix (k=0); above HIGH_KT it is full dead-reckoning (k=1).
  LOW_KT: 8,
  HIGH_KT: 25,
  // Critically-damped easing time constant by zoom. Larger = smoother (more lag),
  // smaller = tighter tracking. High zoom favors smoothness; far zoom favors
  // tight tracking (where a few meters of lag is sub-pixel anyway).
  TAU_HIGH_S: 0.35, // zoom >= ZOOM_HIGH
  TAU_MID_S: 0.25, // ZOOM_MID <= zoom < ZOOM_HIGH
  TAU_FAR_S: 0.15, // zoom < ZOOM_MID
  ZOOM_MID: 9,
  ZOOM_HIGH: 13,
  // Cap on anchor extrapolation age — bounds how far a stale fix is projected.
  MAX_EXTRAP_S: 30,
  // Catch-up clamp: if displayed lags the target by more than this (genuine
  // maneuver / big jump / first acquisition), snap to within this distance
  // before easing so the marker can't lag arbitrarily far behind.
  MAX_CATCHUP_M: 600,
  // Below this displayed-to-target distance the marker is "settled" and the
  // animation loop may stop for it (protects frame rate for idle/slow planes).
  SETTLE_EPSILON_M: 0.2,
} as const

const smoothstep = (edge0: number, edge1: number, x: number) => {
  if (edge1 <= edge0) return x >= edge1 ? 1 : 0
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

export const tauForZoom = (zoom: unknown) => {
  const z = toFiniteNumber(zoom)
  const { TAU_HIGH_S, TAU_MID_S, TAU_FAR_S, ZOOM_MID, ZOOM_HIGH } =
    POSITION_SMOOTHING
  if (z == null) return TAU_MID_S
  if (z >= ZOOM_HIGH) return TAU_HIGH_S
  if (z >= ZOOM_MID) return TAU_MID_S
  return TAU_FAR_S
}

const normalizeEpochMs = (value: unknown) => {
  const number = toFiniteNumber(value)
  if (number == null) return null
  return number < 10_000_000_000 ? Math.round(number * 1000) : Math.round(number)
}

// Fix timestamp comes from the source's position-age field (`seen_pos`, falling
// back to `seen`). Documented fallback: if neither is present, use the server/
// receive time so a source without a position-age field is treated as fresh.
export const parseAdsbPositionTime = (
  aircraft: any,
  responseNow?: unknown,
  receiveTime = Date.now(),
) => {
  const serverNow =
    normalizeEpochMs(responseNow) ?? normalizeEpochMs(receiveTime) ?? Date.now()
  const ageSeconds = toFiniteNumber(aircraft?.seen_pos ?? aircraft?.seen)
  if (ageSeconds == null) return serverNow
  return serverNow - Math.max(0, ageSeconds) * 1000
}

// Project an anchor forward along its track by `velocity * elapsed`. The caller
// folds the smoothstep gate `k` into `elapsedMs` (distance = mps * dt * k).
const projectAircraftPosition = (aircraft: any, elapsedMs: number) => {
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
  const dLon =
    lonDivisor === 0 ? 0 : (mps * Math.sin(trackRad) * elapsedSeconds) / lonDivisor

  return { lat: lat + dLat, lon: lon + dLon }
}

const approxMetersBetween = (a: any, b: any) => {
  const aLat = toFiniteNumber(a?.lat)
  const aLon = toFiniteNumber(a?.lon)
  const bLat = toFiniteNumber(b?.lat)
  const bLon = toFiniteNumber(b?.lon)
  if (aLat == null || aLon == null || bLat == null || bLon == null) return 0
  const avgLatRad = (((aLat + bLat) / 2) * Math.PI) / 180
  const north = (bLat - aLat) * METERS_PER_DEGREE_LAT
  const east = (bLon - aLon) * METERS_PER_DEGREE_LAT * Math.cos(avgLatRad)
  return Math.hypot(north, east)
}

// Extrapolation gate: 0 below LOW_KT, 1 above HIGH_KT. Ground/taxi traffic is
// never dead-reckoned — it stops and turns unpredictably, so gs/track projection
// would push the marker the wrong way; the target collapses to the raw fix and
// the easing simply low-passes the ADS-B noise.
const extrapolationGain = (aircraft: any) => {
  if (aircraft?.onGround) return 0
  const velocity = Math.max(0, toFiniteNumber(aircraft?.velocity) ?? 0)
  return smoothstep(POSITION_SMOOTHING.LOW_KT, POSITION_SMOOTHING.HIGH_KT, velocity)
}

// Target = anchor projected forward by (anchor age, clamped) * gate. Exported
// for the offline smoothing harness (the intended position, before easing).
export const computeTargetPosition = (state: any, nowMs: number) => {
  const positionTime = toFiniteNumber(state?.positionTime) ?? nowMs
  const ageMs = clamp(nowMs - positionTime, 0, POSITION_SMOOTHING.MAX_EXTRAP_S * 1000)
  return projectAircraftPosition(state, ageMs * extrapolationGain(state))
}

const dispOf = (state: any) => {
  const lat = toFiniteNumber(state?.dispLat)
  const lon = toFiniteNumber(state?.dispLon)
  if (lat == null || lon == null) return null
  return { lat, lon }
}

// A new fix updates ONLY the anchor. The displayed position AND the easing
// clock carry over from the previous motion state so the marker never teleports
// and the low-pass filter stays continuous across fixes (resetting the clock per
// fix would starve the easing and leave the marker lagging behind).
//
// `prev` may be a full previous motion state (renderer: carries disp + clock) or
// a plain { lat, lon } visual position (focal/trace hooks: seed only). On first
// acquisition the displayed position seeds to the current target.
export const beginAircraftMotionState = (
  aircraft: any,
  nowMs = Date.now(),
  prev: any = null,
) => {
  const prevDispLat = toFiniteNumber(prev?.dispLat ?? prev?.lat)
  const prevDispLon = toFiniteNumber(prev?.dispLon ?? prev?.lon)
  const hasPrevDisp = prevDispLat != null && prevDispLon != null
  const seed = hasPrevDisp
    ? { lat: prevDispLat, lon: prevDispLon }
    : computeTargetPosition(aircraft, nowMs)
  // Carry the easing clock when we have one; otherwise start it now.
  const prevStep = toFiniteNumber(prev?.lastStepMs)
  return {
    ...aircraft,
    dispLat: seed.lat,
    dispLon: seed.lon,
    lastStepMs: prevStep ?? nowMs,
  }
}

// Advance the displayed position one frame toward the target and persist it back
// onto `state`. Frame-rate independent: alpha = 1 - exp(-dtFrame / tau), so the
// throttled motion loop (variable cadence by zoom) converges identically.
export const calculateAircraftVisualPosition = (
  state: any,
  nowMs = Date.now(),
  zoom?: unknown,
) => {
  if (!state) return { lat: 0, lon: 0 }
  const target = computeTargetPosition(state, nowMs)

  const disp = dispOf(state) ?? target
  const lastStepMs = toFiniteNumber(state.lastStepMs) ?? nowMs
  const dtFrameS = Math.max(0, (nowMs - lastStepMs) / 1000)
  const tau = tauForZoom(zoom ?? POSITION_SMOOTHING.ZOOM_HIGH)
  const alpha = tau > 0 ? 1 - Math.exp(-dtFrameS / tau) : 1

  // Catch-up clamp: pull the displayed position to within MAX_CATCHUP_M of the
  // target before easing, so it can never lag arbitrarily far behind.
  let baseLat = disp.lat
  let baseLon = disp.lon
  const errM = approxMetersBetween(disp, target)
  if (errM > POSITION_SMOOTHING.MAX_CATCHUP_M) {
    const keep = POSITION_SMOOTHING.MAX_CATCHUP_M / errM
    baseLat = target.lat + (disp.lat - target.lat) * keep
    baseLon = target.lon + (disp.lon - target.lon) * keep
  }

  const nextLat = baseLat + (target.lat - baseLat) * alpha
  const nextLon = baseLon + (target.lon - baseLon) * alpha

  state.dispLat = nextLat
  state.dispLon = nextLon
  state.lastStepMs = nowMs
  return { lat: nextLat, lon: nextLon }
}

// Read-only view of the current displayed position (no advance). Used by hit
// testing and off-cadence reads that must not double-step the easing.
export const peekAircraftDisplayedPosition = (state: any) => {
  const disp = dispOf(state)
  if (disp) return disp
  const lat = toFiniteNumber(state?.lat)
  const lon = toFiniteNumber(state?.lon)
  if (lat == null || lon == null) return null
  return { lat, lon }
}

// Keep the animation loop alive while the target is still advancing or the
// displayed position has not yet settled onto the target.
export const shouldAnimateAircraftVisualPosition = (
  state: any,
  nowMs = Date.now(),
) => {
  if (!state) return false
  const positionTime = toFiniteNumber(state?.positionTime)
  if (positionTime == null) return false

  const ageS = (nowMs - positionTime) / 1000
  const gain = extrapolationGain(state)
  const velocity = Math.max(0, toFiniteNumber(state?.velocity) ?? 0)
  // Target still moving forward this frame?
  if (velocity * gain > 0 && ageS < POSITION_SMOOTHING.MAX_EXTRAP_S) return true

  // Otherwise animate only until the displayed position settles onto the target.
  const disp = dispOf(state)
  if (!disp) return false
  const target = computeTargetPosition(state, nowMs)
  return approxMetersBetween(disp, target) > POSITION_SMOOTHING.SETTLE_EPSILON_M
}
