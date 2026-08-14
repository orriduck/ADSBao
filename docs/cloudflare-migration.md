# Cloudflare frontend migration

This note records the delivery contract, hosting decision, and completed
production cutover for
[issue #624](https://github.com/orriduck/ADSBao/issues/624). Cloudflare Workers
Static Assets became authoritative for `adsbao.dev` and `www.adsbao.dev` on
2026-08-14; the old Railway frontend was then deleted.

## Pre-migration delivery contract

As inspected on 2026-08-14, Railway deploys `Dockerfile`, which builds the Vite
application and copies `dist/` into Nginx. `nginx.conf.template` owns the public
request boundary:

| Browser path | Current behavior |
| --- | --- |
| `/` and SPA deep links | Nginx serves the Vite build and falls back to `index.html`. |
| `/api/*` | Nginx proxies to `ADSBAO_SERVICE_ORIGIN` over Railway private networking. |
| `/events/*` | Nginx proxies to the same service with HTTP/1.1, buffering/cache disabled, and a one-hour read timeout. |
| `/health` | Nginx proxies the exact path to the service. |
| `/runtime-env.js` | The container writes public New Relic browser settings at startup and serves the file with `no-store`. |
| `/ws` | Returns 404; it must not fall through to the SPA. |
| `/debug/*` | Vite-only local proxy; not part of the deployed public contract. |

The browser continues to use relative same-origin URLs. React routes include
`/airport/:icao`, `/aircraft/:callsign`, `/here`, `/about`, `/mechanism`, and
`/changelog`. The service worker treats `/api/*`, `/events/*`, `/health`,
`/runtime-env.js`, and `adsbao-version.json` as network-only resources.

The local pre-change contract check on 2026-08-14 used `main@d347c4bf` and
confirmed:

- `/`, `/airport/KBOS`, and `/aircraft/DAL1576` returned the Vite HTML shell.
- `/health` returned the service health JSON through Vite.
- `/api/airport/KBOS` returned the airport contract through Vite.
- `/events/nearby/coordinates/42.36/-71.01` returned `text/event-stream` and
  emitted named `nearby:snapshot` and `nearby:traffic` frames without closing.

## Decision: Workers Static Assets

Use Workers Static Assets rather than Pages.

| Criterion | Workers Static Assets | Pages |
| --- | --- | --- |
| Vite SPA/deep links | Native `not_found_handling = single-page-application`. | Supported, but dynamic proxy routes require Pages Functions/file routing. |
| Static delivery | Assets bypass Worker execution unless included in `run_worker_first`. | Static assets are direct, but Functions add a second routing model. |
| Same-origin API/SSE | One Worker selectively intercepts `/api`, `/events`, and `/health`. | Requires Pages Functions or advanced-mode Worker code. |
| SSE | A Worker can return the upstream `Response` without reading its body, preserving streaming. | Uses the same Workers runtime, but adds no advantage for this contract. |
| Future backend Worker/DO | The frontend proxy is already a Worker entry point that can be evolved or replaced. | A later Worker/DO migration would cross the Pages/Workers project boundary. |
| Deployment model | One Wrangler configuration and named preview environment. | Pages build/deploy plus Functions routing configuration. |

The selected configuration keeps content-hashed `/assets/*` immutable, leaves
HTML on Cloudflare's revalidation default, marks the version manifest and
service worker refreshable, and generates the existing security headers into
the build as `_headers`.

## Final topology

```text
Browser
  -> adsbao.dev / www.adsbao.dev
       -> adsbao-frontend.orriduck.workers.dev
       |-- static SPA/assets: Cloudflare Workers Static Assets
       |-- /api, /events, /health: Worker streaming proxy
                                      -> adsbao-service-production.up.railway.app
                                           -> Railway adsbao-service
                                                -> Railway Postgres
```

The Go service now has a Railway public service domain targeting its production
port `8080`. The Worker streams upstream responses without reading their bodies,
so the existing EventSource contract remains intact. Browser application URLs
stay relative and same-origin; the backend origin is a Worker secret rather
than a client-visible runtime value.

`ALLOWED_EVENT_ORIGINS` includes the Cloudflare preview and Workers development
origins in addition to the production custom domains. The Worker preserves the
browser `Origin` header rather than rewriting it.

## Local preview

```bash
cp .dev.vars.preview.example .dev.vars.preview
pnpm cloudflare:dev
```

Wrangler serves the Worker at `http://localhost:8787`; the example binds its
backend proxy to the local Go service at `http://localhost:8082`. The dev script
disables Wrangler's `.env` fallback, and the Wrangler configuration allows only
the four declared preview bindings, so unrelated application variables are not
injected into the Worker.

Verify at minimum:

```bash
curl -I http://localhost:8787/
curl -I http://localhost:8787/airport/KBOS
curl -I http://localhost:8787/aircraft/DAL1576
curl http://localhost:8787/health
curl http://localhost:8787/api/airport/KBOS
curl -N http://localhost:8787/events/nearby/coordinates/42.36/-71.01
```

Also check `/ws` returns 404, `dist/_headers` exists, hashed assets carry the
immutable policy, and `adsbao-version.json`, `sw.js`, and `runtime-env.js` are
not served with a long-lived cache policy.

## Cloudflare preview deployment

The account-level Workers development subdomain is `orriduck.workers.dev`. The
named preview environment is deployed at:

```text
https://adsbao-frontend-preview.orriduck.workers.dev
```

Authenticate Wrangler, then configure bindings without committing values:

```bash
pnpm exec wrangler login
pnpm exec wrangler secret put ADSBAO_SERVICE_ORIGIN --env preview
pnpm exec wrangler secret put VITE_NEW_RELIC_ACCOUNT_ID --env preview
pnpm exec wrangler secret put VITE_NEW_RELIC_BROWSER_APP_ID --env preview
pnpm exec wrangler secret put VITE_NEW_RELIC_BROWSER_LICENSE_KEY --env preview
pnpm cloudflare:deploy:preview
```

Set `ADSBAO_SERVICE_ORIGIN` to the Railway `adsbao-service` public origin. The
three New Relic values are public browser identifiers but remain deployment
configuration rather than repository constants.

The first remote preview deployment completed on 2026-08-14 as Worker version
`c42f09eb-952c-4b35-9efd-be9ae3599068`. Its validation confirmed:

- `/`, `/airport/KBOS`, and `/aircraft/DAL1576` returned the SPA shell.
- `/health` and `/api/airport/KBOS` returned the existing JSON contracts.
- `/ws` returned 404.
- `sw.js` and `adsbao-version.json` were not cacheable, while hashed assets
  used a one-year immutable policy.
- `ALLOWED_EVENT_ORIGINS` on `adsbao-service` was extended with the preview
  origin. Browser DevTools then observed `/events/...` return
  `200 text/event-stream` and deliver `nearby:snapshot` plus repeated
  `nearby:traffic` events.
- The KBOS airport page rendered live aircraft in Chrome with no console
  warnings or errors.

## Production deployment

The root Wrangler environment is the production Worker. Its secrets use the
same four names as preview and its custom-domain routes are declared in
`wrangler.jsonc`:

```bash
pnpm exec wrangler secret put ADSBAO_SERVICE_ORIGIN
pnpm exec wrangler secret put VITE_NEW_RELIC_ACCOUNT_ID
pnpm exec wrangler secret put VITE_NEW_RELIC_BROWSER_APP_ID
pnpm exec wrangler secret put VITE_NEW_RELIC_BROWSER_LICENSE_KEY
pnpm cloudflare:deploy:production
```

The production deployment completed as Worker version
`c7c3eead-7c88-4f48-9670-9d04fb907c01` and owns:

- `https://adsbao.dev`
- `https://www.adsbao.dev`
- `https://adsbao-frontend.orriduck.workers.dev`

The named preview environment declares an empty `routes` array so it cannot
inherit production custom domains.

## Production verification

After custom-domain activation, and again after deleting the Railway frontend,
the following checks passed on 2026-08-14:

- `/`, `/airport/KBOS`, and `/aircraft/DAL1576` returned the SPA shell on both
  custom domains.
- `/health` and `/api/airport/KBOS` returned the Go service JSON contracts;
  `/ws` returned 404.
- `/runtime-env.js`, `/adsbao-version.json`, and `/sw.js` returned the expected
  JavaScript/JSON resources. The version manifest and service worker use
  refresh-safe cache controls; content-hashed assets use a one-year immutable
  policy and returned `CF-Cache-Status: HIT`.
- An EventSource request from `https://adsbao.dev` returned
  `200 text/event-stream`, the exact allowed origin, `no-cache, no-transform`,
  and live `nearby:snapshot` plus `nearby:traffic` frames.
- Chrome rendered the KBOS map with live aircraft after a fresh navigation.
  The page was controlled by `https://adsbao.dev/sw.js`; its registration and
  controller were `activated`, with no waiting or installing worker.
- Browser DevTools observed the production EventSource response and no console
  warnings or errors before removal. A fresh navigation after removal rendered
  new live counts and aircraft; the terminal contract check independently
  reconfirmed SSE at the same origin.

Five warm requests from the same machine gave the following delivery snapshot.
The hashed CSS filenames differed because the Railway frontend was one build
behind, so each origin was measured with the asset referenced by its own HTML:

| Resource | Cloudflare average | Railway average | Payload |
| --- | ---: | ---: | ---: |
| HTML TTFB / total | 47.3 ms / 48.2 ms | 71.5 ms / 71.7 ms | 2,161 bytes |
| Hashed CSS TTFB / total | 46.5 ms / 96.0 ms | 60.2 ms / 156.0 ms | about 464 KB |

These are a cutover sanity check, not a geographically representative
benchmark.

## Cutover completion

The old Railway custom domains and conflicting Cloudflare CNAME records were
removed only after the production Worker passed the checks above. Railway
service `adsbao-app` was then deleted. Its former generated URL now returns 404;
Railway retains only `adsbao-service` and Postgres for this application.

The user explicitly chose not to retain the Railway frontend as a hot rollback
target. Recovery therefore means redeploying a frontend from Git history or a
known Cloudflare Worker version, not switching DNS back to a running Railway
frontend. The backend database, business behavior, and realtime protocol were
not migrated or removed.
