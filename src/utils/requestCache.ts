type RequestCacheOptions<T> = {
  ttlMs?: number;
  shouldCache?: (payload: T) => boolean;
  now?: () => number;
};

type RequestOptions = {
  cache?: boolean;
  coalesce?: boolean;
};

export function createRequestCache<T>({
  ttlMs = 0,
  shouldCache = (payload) => payload != null,
  now = () => Date.now(),
}: RequestCacheOptions<T> = {}) {
  const inFlight = new Map<string, Promise<T>>();
  const memory = new Map<string, { expiresAt: number; payload: T }>();

  const readMemory = (key: string) => {
    const cached = memory.get(key);
    if (!cached) return { hit: false, payload: undefined as T | undefined };
    if (cached.expiresAt > now()) return { hit: true, payload: cached.payload };
    memory.delete(key);
    return { hit: false, payload: undefined as T | undefined };
  };

  return {
    request(
      key: string,
      load: () => T | Promise<T>,
      { cache = true, coalesce = true }: RequestOptions = {},
    ) {
      const useMemory = cache && ttlMs > 0;
      if (useMemory) {
        const cached = readMemory(key);
        if (cached.hit) return Promise.resolve(cached.payload as T);
      }

      if (coalesce) {
        const pending = inFlight.get(key);
        if (pending) return pending;
      }

      let loaded: Promise<T>;
      try {
        loaded = Promise.resolve(load());
      } catch (error) {
        loaded = Promise.reject(error);
      }

      const promise = loaded
        .then((payload) => {
          if (useMemory && shouldCache(payload)) {
            memory.set(key, {
              expiresAt: now() + ttlMs,
              payload,
            });
          }
          return payload;
        })
        .finally(() => {
          if (inFlight.get(key) === promise) inFlight.delete(key);
        });

      if (coalesce) inFlight.set(key, promise);
      return promise;
    },
    clear(key?: string) {
      if (key == null) {
        inFlight.clear();
        memory.clear();
        return;
      }
      inFlight.delete(key);
      memory.delete(key);
    },
  };
}
