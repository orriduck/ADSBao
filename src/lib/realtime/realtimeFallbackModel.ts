export type RealtimeConnectionState = "closed" | "connecting" | "disabled" | "open";

type RealtimeFallbackInput = {
  available: boolean;
  connectionState: RealtimeConnectionState;
  eventType?: string;
  graceExpired: boolean;
  hasEvent: boolean;
  hasEventData: boolean;
};

export function shouldUseRealtimeFallback({
  available,
  connectionState,
  eventType = "",
  graceExpired,
  hasEvent,
  hasEventData,
}: RealtimeFallbackInput) {
  if (!available || connectionState === "disabled") return true;
  if (eventType === "channel:error" && !hasEventData) return true;
  if (!hasEvent && !graceExpired) return false;
  if (connectionState === "open" && hasEvent) return false;
  return connectionState !== "open" || !hasEvent;
}
