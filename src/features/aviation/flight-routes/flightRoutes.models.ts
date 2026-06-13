// Lookup hits cache aggressively at the edge; misses use a shorter TTL so a
// provider miss can be retried quickly without hammering the upstream.
const ROUTE_CACHE_TTL_SECONDS = 60 * 60;
const ROUTE_MISS_CACHE_TTL_SECONDS = 5 * 60;
const ROUTE_STALE_WHILE_REVALIDATE_SECONDS = 10 * 60;

// We always reply 200 — even on a miss — so the Vercel edge caches the
// empty body. A 404 would short-circuit the CDN and make every miss hit
// the origin again on the next aircraft pass.
export const ROUTE_MISS_STATUS = 200;

export function buildRouteCacheHeaders(body, { bypassSharedCache = false } = {}) {
  if (bypassSharedCache || body?.source === "flightaware") {
    return { "Cache-Control": "no-store" };
  }

  // Temporary routes should never land in the shared CDN cache. The current
  // provider lookup path does not return them, but keep the guard local to the
  // cache policy in case another endpoint reuses this helper.
  if (body && body.temporary) {
    return { "Cache-Control": "no-store" };
  }
  const ttl = body ? ROUTE_CACHE_TTL_SECONDS : ROUTE_MISS_CACHE_TTL_SECONDS;
  const swr = ROUTE_STALE_WHILE_REVALIDATE_SECONDS;
  const sharedValue = `public, s-maxage=${ttl}, stale-while-revalidate=${swr}`;
  return {
    "Cache-Control": `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=${swr}`,
    "CDN-Cache-Control": sharedValue,
    "Vercel-CDN-Cache-Control": sharedValue,
  };
}
