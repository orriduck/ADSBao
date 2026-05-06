const CACHE_PREFIX = "adsbao:airport-directory:v1:";
const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000;

const memoryCache = new Map();

const resolveStorage = (storage) => {
  if (storage) return storage;
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  return null;
};

const safeParse = (rawValue) => {
  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
};

export function createAirportDirectoryCache({
  storage,
  now = () => Date.now(),
  ttlMs = DEFAULT_TTL_MS,
} = {}) {
  const resolvedStorage = resolveStorage(storage);

  const getCached = (cacheKey) => {
    const memoryEntry = memoryCache.get(cacheKey);
    if (memoryEntry && memoryEntry.expiresAt > now()) {
      return { ...memoryEntry.payload, cache: "hit" };
    }
    if (memoryEntry) {
      memoryCache.delete(cacheKey);
    }

    if (!resolvedStorage) return null;

    const storageKey = `${CACHE_PREFIX}${cacheKey}`;
    const parsed = safeParse(resolvedStorage.getItem(storageKey));
    if (!parsed || parsed.expiresAt <= now()) {
      resolvedStorage.removeItem(storageKey);
      return null;
    }

    memoryCache.set(cacheKey, parsed);
    return { ...parsed.payload, cache: "hit" };
  };

  const setCached = (cacheKey, payload) => {
    const entry = {
      expiresAt: now() + ttlMs,
      payload,
    };
    memoryCache.set(cacheKey, entry);
    if (resolvedStorage) {
      resolvedStorage.setItem(`${CACHE_PREFIX}${cacheKey}`, JSON.stringify(entry));
    }
    return { ...payload, cache: "miss" };
  };

  return { getCached, setCached };
}
