# Cloudflare frontend migration

This note records the Phase 0 delivery contract and the initial hosting decision
for [issue #624](https://github.com/orriduck/ADSBao/issues/624). It is a preview
runbook, not evidence that the production domain has moved.

## Current delivery contract

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

## Preview topology

```text
Browser
  -> adsbao-frontend-preview.<account>.workers.dev
       |-- static SPA/assets: Cloudflare Workers Static Assets
       |-- /api, /events, /health: Worker streaming proxy
                                      -> adsbao-app-production.up.railway.app
                                           -> Railway private adsbao-service
```

The extra Railway Nginx hop is deliberate for preview. The private Go service
currently has no public Railway domain, while the existing frontend service has
a stable Railway service domain and already owns the verified private proxy.
This avoids exposing the private service merely to start frontend validation.
It also keeps the production Railway frontend untouched as the rollback target.

Before preview SSE browser testing, add the final Workers preview origin to the
private service's allowed event origins. Do not rewrite the browser `Origin`
header in the Worker to bypass that check.

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

Set `ADSBAO_SERVICE_ORIGIN` to the existing Railway frontend service origin for
this transition. The three New Relic values are public browser identifiers but
remain deployment configuration rather than repository constants.

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

No production custom-domain route is present in `wrangler.jsonc`. Add it only
after preview REST, SSE, PWA/update, responsive rendering, and before/after
delivery measurements pass.

## Cutover and rollback boundary

Cutover must retain the Railway frontend until the Cloudflare production origin
has passed deep-link, REST, health, SSE reconnect/stale, PWA update, desktop,
and mobile checks. The first rollback is DNS/custom-domain routing back to the
existing Railway frontend. No database, backend business behavior, realtime
protocol, or service lifecycle change belongs in this migration.

Removing the Railway frontend requires a later independently verified route
from Cloudflare to `adsbao-service`; the preview's Nginx hop is not that final
state.
