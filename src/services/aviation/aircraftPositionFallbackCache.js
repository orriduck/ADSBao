const DEFAULT_MAX_AGE_MS = 90_000;
const DEFAULT_MAX_ENTRIES = 8;

export function createAircraftPositionFallbackCache({
  maxAgeMs = DEFAULT_MAX_AGE_MS,
  maxEntries = DEFAULT_MAX_ENTRIES,
  now = () => Date.now(),
} = {}) {
  const entries = new Map();

  const evictExpired = (currentTime) => {
    for (const [key, value] of entries.entries()) {
      if (currentTime - value.cachedAtMs > maxAgeMs) {
        entries.delete(key);
      }
    }
  };

  const evictOverflow = () => {
    while (entries.size > maxEntries) {
      const oldestKey = entries.keys().next().value;
      if (!oldestKey) return;
      entries.delete(oldestKey);
    }
  };

  return {
    remember(key, payload) {
      if (!key || !payload || typeof payload !== "object") return;

      const currentTime = now();
      evictExpired(currentTime);
      entries.delete(key);
      entries.set(key, {
        payload,
        cachedAtMs: currentTime,
      });
      evictOverflow();
    },

    recall(key) {
      if (!key) return null;

      const currentTime = now();
      evictExpired(currentTime);
      const cached = entries.get(key);
      if (!cached) return null;

      entries.delete(key);
      entries.set(key, cached);
      return {
        payload: cached.payload,
        staleAgeMs: currentTime - cached.cachedAtMs,
      };
    },

    clear() {
      entries.clear();
    },
  };
}
