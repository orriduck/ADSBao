export class MemoryTtlCache<TValue> {
  private readonly ttlMs: number;
  private readonly now: () => number;
  private readonly entries = new Map<string, { value: TValue; expiresAt: number }>();

  constructor({ ttlMs = 10_000, now = Date.now } = {}) {
    this.ttlMs = ttlMs;
    this.now = now;
  }

  get(key: string): TValue | null {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: TValue, ttlMs = this.ttlMs) {
    this.entries.set(key, {
      value,
      expiresAt: this.now() + ttlMs,
    });
  }

  delete(key: string) {
    this.entries.delete(key);
  }

  clear() {
    this.entries.clear();
  }
}
