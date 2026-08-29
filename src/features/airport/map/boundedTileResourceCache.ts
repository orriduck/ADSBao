type CacheStatus = "pending" | "ready" | "error";

type CacheListener<T> = {
  ready?: (value: T) => void;
  error?: () => void;
};

type CacheEntry<T> = {
  status: CacheStatus;
  value: T | null;
  lastUsed: number;
  failedAt: number | null;
  consumers: Map<symbol, CacheListener<T>>;
};

export type BoundedTileCacheHandle<T> = {
  cacheHit: boolean;
  status: CacheStatus;
  value: T | null;
  release: () => void;
};

export class BoundedTileResourceCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();
  private clock = 0;
  private disposed = false;

  constructor(
    private readonly options: {
      maxEntries: number;
      load: (key: string) => Promise<T>;
      dispose: (value: T) => void;
      retryErrorsAfterMs?: number;
      now?: () => number;
    },
  ) {}

  acquire(
    key: string,
    listener: CacheListener<T> = {},
  ): BoundedTileCacheHandle<T> {
    if (this.disposed) {
      return {
        cacheHit: false,
        status: "error",
        value: null,
        release: () => {},
      };
    }
    let existing = this.entries.get(key);
    const retryErrorsAfterMs = Math.max(
      0,
      this.options.retryErrorsAfterMs ?? Number.POSITIVE_INFINITY,
    );
    if (
      existing?.status === "error" &&
      existing.consumers.size === 0 &&
      existing.failedAt != null &&
      this.now() - existing.failedAt >= retryErrorsAfterMs
    ) {
      this.entries.delete(key);
      existing = undefined;
    }
    const cacheHit = Boolean(existing);
    const entry = existing || this.createEntry(key);
    entry.lastUsed = ++this.clock;
    const token = Symbol(key);
    entry.consumers.set(token, listener);
    this.prune();
    let released = false;
    return {
      cacheHit,
      status: entry.status,
      value: entry.value,
      release: () => {
        if (released) return;
        released = true;
        entry.consumers.delete(token);
        this.prune();
      },
    };
  }

  snapshot() {
    const values = [...this.entries.values()];
    return {
      size: values.length,
      ready: values.filter((entry) => entry.status === "ready").length,
      pending: values.filter((entry) => entry.status === "pending").length,
    };
  }

  forEachReady(callback: (value: T, key: string) => void) {
    this.entries.forEach((entry, key) => {
      if (entry.status === "ready" && entry.value) callback(entry.value, key);
    });
  }

  disposeAll() {
    if (this.disposed) return;
    this.disposed = true;
    for (const entry of this.entries.values()) {
      if (entry.value) this.options.dispose(entry.value);
      entry.consumers.clear();
    }
    this.entries.clear();
  }

  private createEntry(key: string) {
    const entry: CacheEntry<T> = {
      status: "pending",
      value: null,
      lastUsed: ++this.clock,
      failedAt: null,
      consumers: new Map(),
    };
    this.entries.set(key, entry);
    this.options.load(key).then(
      (value) => {
        if (this.disposed || this.entries.get(key) !== entry) {
          this.options.dispose(value);
          return;
        }
        entry.status = "ready";
        entry.value = value;
        entry.failedAt = null;
        entry.consumers.forEach((listener) => listener.ready?.(value));
        this.prune();
      },
      () => {
        if (this.disposed || this.entries.get(key) !== entry) return;
        entry.status = "error";
        entry.failedAt = this.now();
        entry.consumers.forEach((listener) => listener.error?.());
        this.prune();
      },
    );
    return entry;
  }

  private prune() {
    const maxEntries = Math.max(1, Math.round(this.options.maxEntries));
    while (this.entries.size > maxEntries) {
      const candidate = [...this.entries.entries()]
        .filter(([, entry]) => entry.consumers.size === 0)
        .sort(([, left], [, right]) => left.lastUsed - right.lastUsed)[0];
      if (!candidate) return;
      const [key, entry] = candidate;
      this.entries.delete(key);
      if (entry.value) this.options.dispose(entry.value);
    }
  }

  private now() {
    return this.options.now?.() ?? Date.now();
  }
}
