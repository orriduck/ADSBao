import { ADSBAO_OFFLINE_NAVIGATION_PATHS, ADSBAO_NETWORK_ONLY_PATHS, ADSBAO_NETWORK_ONLY_PREFIXES } from "./pwaCachePolicy";

export function buildAdsbaoServiceWorkerSource({
  cacheName,
  precacheUrls,
}: {
  cacheName: string;
  precacheUrls: string[];
}) {
  return `const CACHE_NAME = ${JSON.stringify(cacheName)};
const CACHE_PREFIX = "adsbao-static-";
const PRECACHE_URLS = ${JSON.stringify(precacheUrls, null, 2)};
const OFFLINE_NAVIGATION_PATHS = ${JSON.stringify(ADSBAO_OFFLINE_NAVIGATION_PATHS)};
const NETWORK_ONLY_PATHS = ${JSON.stringify(ADSBAO_NETWORK_ONLY_PATHS)};
const NETWORK_ONLY_PREFIXES = ${JSON.stringify(ADSBAO_NETWORK_ONLY_PREFIXES)};
const RUNTIME_ENV_FALLBACK = "window.__ADSBAO_ENV__ = Object.assign({}, window.__ADSBAO_ENV__, {});\\n";

function cleanNavigationPath(pathname) {
  return pathname.replace(/\\/+$/, "") || "/";
}

function isOfflineNavigation(pathname) {
  return OFFLINE_NAVIGATION_PATHS.includes(cleanNavigationPath(pathname));
}

function isNetworkOnly(pathname) {
  return NETWORK_ONLY_PATHS.includes(pathname) ||
    NETWORK_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(PRECACHE_URLS.map((url) => new Request(url, { cache: "reload" }))),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname === "/runtime-env.js") {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(RUNTIME_ENV_FALLBACK, {
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "no-store",
          },
        }),
      ),
    );
    return;
  }

  if (isNetworkOnly(url.pathname)) return;

  if (request.mode === "navigate" && isOfflineNavigation(url.pathname)) {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return await cache.match("/") || await cache.match("/index.html");
      }),
    );
    return;
  }

  if (PRECACHE_URLS.includes(url.pathname)) {
    event.respondWith(cacheFirst(request, url.pathname));
  }
});

async function cacheFirst(request, cacheKey) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  return fetch(request);
}

`;
}
