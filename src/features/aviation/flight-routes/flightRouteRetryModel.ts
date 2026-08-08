export const ROUTE_RETRY_BASE_MS = 2_000;
export const ROUTE_RETRY_MAX_MS = 60_000;

export function isTemporaryRouteFailure(status: number | null) {
  if (status == null) return true;
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

export function parseRetryAfterMs(value: unknown, now = Date.now()) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1_000);
  const retryAt = Date.parse(raw);
  return Number.isFinite(retryAt) ? Math.max(0, retryAt - now) : null;
}

export function resolveRouteRetryDelayMs({
  attempt,
  retryAfterMs = null,
  random = Math.random,
}: {
  attempt: number;
  retryAfterMs?: number | null;
  random?: () => number;
}) {
  // A positive Retry-After is an explicit server pacing instruction. Capping
  // it locally would retry early (and can make a 429 storm worse).
  if (retryAfterMs != null && retryAfterMs > 0) return retryAfterMs;
  const exponential = Math.min(
    ROUTE_RETRY_MAX_MS,
    ROUTE_RETRY_BASE_MS * 2 ** Math.max(0, attempt),
  );
  // Keep requests from many tabs from landing on the exact same retry moment.
  const jitter = 0.8 + Math.max(0, Math.min(1, random())) * 0.4;
  return Math.round(exponential * jitter);
}
