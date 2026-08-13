# ADSBao — Copilot Instructions

ADSBao is a Vite-built React public frontend for map-first airport monitoring.
The private `adsbao-service` repository owns all server endpoints,
persistence, upstream integrations, and credentials. Do not generate a Next.js
App Router, Vercel-only deployment code, browser authentication flows, database
code, or provider-specific fallbacks in this repository.

Read `AGENTS.md` and `CLAUDE.md` before proposing changes. Read `DESIGN.md`
before UI work and `PRODUCT.md` before changing product behavior. These project
documents override generic design or framework instructions when they conflict.

## Active technical contracts

- Vite runs on port 3000. Its same-origin `/api`, `/events`, and `/health`
  routes proxy to the private service on port 8082 for local development.
  Local-only `/debug` diagnostics are also proxied; deployed Nginx does not
  expose `/debug`.
- Nearby realtime is Server-Sent Events with `EventSource` under `/events/...`.
  `/ws` is intentionally retired and returns 404.
- The production image is static Nginx with SPA fallback; it proxies those same
  three routes over the private network.
- Airport map preferences are browser `localStorage`, not user/account state.

## Implementation and verification

- Use `pnpm debug:local` for UI-only work. Inspect the affected browser route,
  relevant theme and responsive state; do not substitute unit tests for visual
  review.
- Use `pnpm debug:local:service` and `pnpm debug:local:status` for API, SSE,
  proxy, or private-service contract work. Inspect SSE frames in browser
  DevTools when realtime changes.
- For non-trivial work, run `pnpm build` and the focused active tests. A prior
  build or deployment does not verify the current diff.
- Fixed sidebars and in-flow panels use the 36px Operational Wayfinding rail
  and flat white/black surfaces. Existing frosted tokens are for floating map
  controls, menus, sheets, and dialogs only.
