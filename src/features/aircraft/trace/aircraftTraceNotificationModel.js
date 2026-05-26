export function resolveAircraftTraceNotificationMode({
  notifyInitialFetch = true,
} = {}) {
  return notifyInitialFetch !== false;
}
