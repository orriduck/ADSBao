export const toFiniteNumber = (value) => {
  if (value == null || value === "") return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export const toRadians = (degrees: number) => (degrees * Math.PI) / 180

export const toDegrees = (radians: number) => (radians * 180) / Math.PI

// Wrap any angle into the [0, 360) range.
export const normalizeDegrees = (degrees: number) =>
  ((degrees % 360) + 360) % 360

// Parse a heading-like value, rejecting non-finite or negative inputs, and
// wrap the result into [0, 360). Returns null when the input is unusable.
export const normalizeHeadingDeg = (value: unknown) => {
  const heading = toFiniteNumber(value)
  if (heading == null || heading < 0) return null
  return normalizeDegrees(heading)
}

// Smallest signed turn (deg) from one bearing to another, in (-180, 180].
export const signedBearingDelta = (fromDeg: number, toDeg: number) => {
  let delta = normalizeDegrees(toDeg) - normalizeDegrees(fromDeg)
  if (delta > 180) delta -= 360
  if (delta <= -180) delta += 360
  return delta
}
