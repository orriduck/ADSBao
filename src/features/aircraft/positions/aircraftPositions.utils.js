export function formatAircraftPositionAttempt(providerId, error) {
  if (!error) return `${providerId}:200`;
  return `${providerId}:${error.status || "ERR"}`;
}
