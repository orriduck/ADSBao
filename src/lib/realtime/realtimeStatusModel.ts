export function resolveRealtimeStatusLabel({
  available,
  connectionState,
  settled,
}: {
  available: boolean;
  connectionState: string;
  settled: boolean;
}) {
  if (
    !available ||
    connectionState === "disabled" ||
    connectionState === "live" ||
    connectionState === "stale"
  ) {
    return "";
  }
  return settled || connectionState === "reconnecting" ? "RECONNECTING" : "CONNECTING";
}
