import {
  shouldTriggerVisibilityRefreshOverlay,
} from "./aircraftLoadingOverlayModel";

export function resolveAircraftVisibilityPolling({
  documentHidden = false,
  hasActiveQuery = false,
  wasActive = false,
  pollWhenHidden = false,
  hiddenSince = 0,
  now = Date.now(),
  minHiddenMs = 0,
  maxHiddenPollMs = Number.POSITIVE_INFINITY,
} = {}) {
  const active = Boolean(hasActiveQuery || wasActive);

  if (documentHidden) {
    const hiddenDurationMs =
      Number(hiddenSince) > 0 ? Number(now) - Number(hiddenSince) : 0;
    const hiddenPollExpired =
      Number.isFinite(Number(maxHiddenPollMs)) &&
      hiddenDurationMs >= Number(maxHiddenPollMs);
    return {
      shouldStopPolling: Boolean(
        active && (!pollWhenHidden || hiddenPollExpired),
      ),
      shouldRefreshNow: false,
      shouldShowRefreshOverlay: false,
    };
  }

  return {
    shouldStopPolling: false,
    shouldRefreshNow: Boolean(active),
    shouldShowRefreshOverlay: shouldTriggerVisibilityRefreshOverlay({
      wasActive: active,
      hiddenSince,
      now,
      minHiddenMs,
    }),
  };
}
