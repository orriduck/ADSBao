function finiteTimestamp(value: unknown) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

// A tracked marker may only advance from an explicitly fresh frame. A lower
// source position timestamp is an out-of-order fix, not a correction to draw
// backward; the next fresh fix will replace it naturally.
export function shouldAcceptTrackedPositionFrame({
  stale = false,
  previousPositionTime,
  incomingPositionTime,
}: {
  stale?: boolean;
  previousPositionTime?: unknown;
  incomingPositionTime?: unknown;
}) {
  if (stale) return false;
  const previous = finiteTimestamp(previousPositionTime);
  const incoming = finiteTimestamp(incomingPositionTime);
  return previous == null || incoming == null || incoming >= previous;
}
