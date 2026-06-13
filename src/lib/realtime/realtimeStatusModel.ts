export function resolveRealtimeStatusLabel({
  available,
  connectionState,
  settled,
}: {
  available: boolean;
  connectionState: string;
  settled: boolean;
}) {
  if (!available || connectionState === "disabled" || connectionState === "open") {
    return "";
  }
  return settled ? "RECONNECTING" : "CONNECTING";
}
