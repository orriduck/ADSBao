// Per-process cool-down tracker for upstream provider health. When a
// provider fails with a retriable status (5xx / 429 / network / timeout),
// the proxy marks it unhealthy for a short window — subsequent requests
// from the same instance skip straight to the next provider in the chain
// until the cool-down lapses, then re-probe the primary automatically.
//
// Vercel's serverless model gives each instance its own memory, so this
// state is per-instance. That's fine for the "lots of 503s in a row from
// adsb.lol" case: each instance learns independently and recovers
// independently when adsb.lol comes back.

const DEFAULT_COOL_DOWN_MS = 90_000;
const RETRIABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export function isRetriableStatus(status) {
  return RETRIABLE_STATUSES.has(Number(status));
}

export function createProviderHealthTracker({
  coolDownMs = DEFAULT_COOL_DOWN_MS,
  now = () => Date.now(),
} = {}) {
  const unhealthyUntil = new Map();

  const isUnhealthy = (providerId) => {
    const until = unhealthyUntil.get(providerId);
    if (until == null) return false;
    if (now() >= until) {
      unhealthyUntil.delete(providerId);
      return false;
    }
    return true;
  };

  return {
    markUnhealthy(providerId) {
      unhealthyUntil.set(providerId, now() + coolDownMs);
    },
    isUnhealthy,
    snapshot() {
      const result = {};
      const currentTime = now();
      for (const [id, until] of unhealthyUntil.entries()) {
        if (until > currentTime) result[id] = until - currentTime;
      }
      return result;
    },
    clear() {
      unhealthyUntil.clear();
    },
  };
}

// Order a provider chain so healthy providers come first, preserving
// their declared order; unhealthy providers stay in the chain as last-resort
// fallbacks (the cool-down might be stale). Pure function — no side effects.
export function selectProviderOrder(chain, healthTracker) {
  const healthy = [];
  const unhealthy = [];
  for (const provider of chain) {
    if (healthTracker.isUnhealthy(provider.id)) unhealthy.push(provider);
    else healthy.push(provider);
  }
  return [...healthy, ...unhealthy];
}
