type RealtimeConnectionState =
  | "disabled"
  | "loading"
  | "live"
  | "stale"
  | "reconnecting";

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
  if (eventType === "nearby:status" && !hasEventData) return true;
  if (!hasEvent && !graceExpired) return false;
  if ((connectionState === "live" || connectionState === "stale") && hasEvent) {
    return false;
  }
  return connectionState !== "live" && connectionState !== "stale" || !hasEvent;
}
