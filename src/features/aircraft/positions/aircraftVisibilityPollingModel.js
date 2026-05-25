import {
  shouldTriggerVisibilityRefreshOverlay,
} from "./aircraftLoadingOverlayModel.js";

export function resolveAircraftVisibilityPolling({
  documentHidden = false,
  hasActiveQuery = false,
  wasActive = false,
  pollWhenHidden = false,
  hiddenSince = 0,
  now = Date.now(),
  minHiddenMs = 0,
} = {}) {
  const active = Boolean(hasActiveQuery || wasActive);

  if (documentHidden) {
    return {
      shouldStopPolling: Boolean(active && !pollWhenHidden),
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
