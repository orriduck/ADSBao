export function formatAircraftPositionAttempt(providerId: string, error?: any) {
  if (!error) return `${providerId}:200`;
  return `${providerId}:${error.status || "ERR"}`;
}
