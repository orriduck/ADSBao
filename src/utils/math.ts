export const toFiniteNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}
