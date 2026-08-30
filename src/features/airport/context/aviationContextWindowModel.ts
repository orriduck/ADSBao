export type ContextTileWindowResolution<T> = {
  canPromote: boolean;
  payloads: T[];
  loaded: number;
  failed: number;
  error: unknown;
};

export type ContextTileWindowPromotion<T> = {
  items: T[];
  visibleSignature: string;
  promoted: boolean;
};

export function resolveContextTileWindowResults<T>(
  results: PromiseSettledResult<T>[],
  { requireComplete = true }: { requireComplete?: boolean } = {},
): ContextTileWindowResolution<T> {
  const payloads = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  const rejected = results.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );

  return {
    canPromote:
      rejected.length === 0 || (!requireComplete && payloads.length > 0),
    payloads,
    loaded: payloads.length,
    failed: rejected.length,
    error: rejected[0]?.reason ?? null,
  };
}

export function resolveContextTileWindowPromotion<T>({
  currentItems,
  currentVisibleSignature,
  requestSignature,
  resolution,
  nextItems,
}: {
  currentItems: T[];
  currentVisibleSignature: string;
  requestSignature: string;
  resolution: ContextTileWindowResolution<unknown>;
  nextItems: T[];
}): ContextTileWindowPromotion<T> {
  if (!resolution.canPromote) {
    return {
      items: currentItems,
      visibleSignature: currentVisibleSignature,
      promoted: false,
    };
  }
  return {
    items: nextItems,
    visibleSignature: requestSignature,
    promoted: true,
  };
}

export function resolveContextTileWindowRetryDelay({
  attempt,
  retryLimit,
  baseDelayMs,
}: {
  attempt: number;
  retryLimit: number;
  baseDelayMs: number;
}) {
  const safeAttempt = Math.max(0, Math.round(Number(attempt) || 0));
  const safeLimit = Math.max(0, Math.round(Number(retryLimit) || 0));
  if (safeAttempt >= safeLimit) return null;
  return Math.max(1_000, Math.round(Number(baseDelayMs) || 30_000)) *
    2 ** safeAttempt;
}
