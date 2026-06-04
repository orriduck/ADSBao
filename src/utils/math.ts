export const toFiniteNumber = (value) => {
  if (value == null || value === "") return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}
