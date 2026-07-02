// Backoff policy for the HTTP position-polling fallback. The realtime
// WebSocket path needs no pacing, but when the fallback poller hits a
// failing or rate-limited upstream, retrying every base interval just
// hammers it. Consecutive failures double the delay up to a cap; one
// success resets to the base cadence.

export function resolveNextPollDelayMs({
  baseMs = 3_000,
  maxMs = 30_000,
  consecutiveFailures = 0,
} = {}) {
  const base = Math.max(1, Number(baseMs) || 1);
  const cap = Math.max(base, Number(maxMs) || base);
  const failures = Math.max(0, Math.floor(Number(consecutiveFailures) || 0));
  if (failures === 0) return base;
  return Math.min(cap, base * 2 ** Math.min(failures, 30));
}
