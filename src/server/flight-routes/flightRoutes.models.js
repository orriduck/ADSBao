import { VRS_ROUTE_MISS_STATUS } from "@/services/aviation/vrsRouteProxyModel.js";

export { VRS_ROUTE_MISS_STATUS };

export const ROUTE_CACHE_TTL_SECONDS = 60 * 60;
export const ROUTE_MISS_CACHE_TTL_SECONDS = 5 * 60;
export const ROUTE_STALE_WHILE_REVALIDATE_SECONDS = 10 * 60;

export function buildRouteCacheHeaders(body) {
  const ttl = body ? ROUTE_CACHE_TTL_SECONDS : ROUTE_MISS_CACHE_TTL_SECONDS;
  const swr = ROUTE_STALE_WHILE_REVALIDATE_SECONDS;
  const sharedValue = `public, s-maxage=${ttl}, stale-while-revalidate=${swr}`;
  return {
    "Cache-Control": `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=${swr}`,
    "CDN-Cache-Control": sharedValue,
    "Vercel-CDN-Cache-Control": sharedValue,
  };
}
