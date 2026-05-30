# ADSBao — Claude Code Guide

## Dev environment

Start the frontend:

```bash
pnpm run dev
```

Frontend runs on `http://localhost:3000` by default.

### Dev server lifecycle (Claude operational rules)

You are expected to keep one long-running `pnpm dev` process on port 3000 across the session. Pattern:

1. **Before touching code**, check whether port 3000 is already serving by hitting `http://localhost:3000` (any 2xx/3xx counts). If it isn't, start the server in the background with the Bash tool's `run_in_background: true` and wait until it's ready (`curl -s -o /dev/null -w '%{http_code}' http://localhost:3000` returns `200`).
2. **Adopt, don't fight, an existing dev server.** If port 3000 is already taken by a `pnpm dev` you started in a prior turn, just use it — don't kill it. Next.js + Turbopack HMR will pick up most edits.
3. **Restart with cache clear when you spot stale-bundle symptoms**, even if you never see an error in the terminal. Symptoms that mean "Turbopack is serving old code":
   - DevTools shows both old + new class names in the same stylesheet after you renamed something.
   - A CSS change that's plainly in `src/style.css` (verify with `grep`) isn't reflected in `getComputedStyle()`.
   - A JSX rename / removed component still appears in the rendered DOM.
   - `curl http://localhost:3000/_next/static/chunks/...css` returns content that doesn't match the source file.

   When you see any of those, run this restart sequence (no need to ask the user first — it's idempotent and recoverable):

   ```bash
   lsof -nP -iTCP:3000 -sTCP:LISTEN | awk 'NR>1 {print $2}' | xargs -r kill
   sleep 2
   rm -rf .next
   pnpm dev   # use run_in_background: true
   # then poll until ready:
   until curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 | grep -q 200; do sleep 2; done
   ```

4. **After the restart**, reload the page in chrome-devtools-mcp with `ignoreCache: true` before re-checking the broken behavior. Verify the source CSS file with `grep` first, then verify the served bundle (`curl /_next/static/chunks/*.css | grep <class>`) before going deeper into a debugging rabbit hole.
5. Never `--turbopack`-disable or `next build` mid-session as a workaround — restarting with `.next` removed is the supported escape hatch and is fast enough on this project (< 10s to ready). Don't add `package.json` scripts for this; it's an operational habit, not a permanent build flag.

## Stack

- **Frontend**: React + Next.js App Router + Tailwind CSS v4 + DaisyUI, managed by `pnpm`.
- **Airport data**: Airport directory data comes from Supabase-hosted OurAirports tables through Next.js API routes. Route lookup and other live aviation data use public provider APIs with frontend or server caching where appropriate.
- **Weather/traffic data**: Web deployment uses Vercel data paths under `/api/proxy/*` because AviationWeather, adsb.lol, and route lookups need same-origin handling for production browser use. Local Next.js dev uses equivalent rewrites where possible.
- **Removed scope**: Live audio/transcription, desktop packaging, Homebrew cask publishing, and Python backend runtime config are no longer part of this repository.

## Key paths

| Path | What |
|---|---|
| `src/config/changelog.js` | Product release history (source of truth; renders the `/changelog` page) |
| `docs/architecture.md` | Current Vercel web architecture and data-path notes |
| `package.json` | App metadata, scripts, dependencies, and current product version |
| `next.config.mjs` | Next.js config and local proxy rewrites |
| `vercel.json` | Vercel build command and production rewrites |
| `src/app/page.js` | Search route entry |
| `src/app/[icao]/page.js` | Airport route entry |
| `src/app/api/proxy/flight-routes/callsign/[callsign]/route.js` | Next.js Route Handler for callsign route lookup |
| `src/components/screens/SearchScreen.jsx` | Thin route entry for airport search UI |
| `src/components/screens/AirportCaptionScreen.jsx` | Thin route entry for airport explorer map + METAR screen |
| `src/components/about/*` | About-page JSX components |
| `src/components/aircraft/*` | Aircraft preview and trace JSX components |
| `src/components/airport/*` | Airport explorer and search JSX components |
| `src/components/map/*` | Leaflet map JSX components and map controls |
| `src/components/weather/*` | Weather slide JSX components and view hooks |
| `src/app/api/_shared/*` | Route-handler-only helpers for validation, rate limits, upstream fetches, and API responses |
| `src/app/api/dao/*.dao.js` | Persistence boundary for Supabase/SQL reads and writes |
| `src/features/aircraft/*` | Aircraft filters, icons, photos, positions, preview, and trace logic |
| `src/features/airport/*` | Airport context, directory, explorer, map, nearby, procedures, search, and wiki logic |
| `src/features/aviation/*` | Aviation provider clients and flight-route mechanisms |
| `src/features/weather/*` | Weather models and METAR mechanisms |
| `src/features/about/*` | About-page view models |
| `src/features/app-shell/*` | Theme preference state and helpers |
| `src/hooks/*.js` | React hooks for METAR, ADS-B positions, route lookups, wiki summaries, and scroll parallax |
| `src/constants/aircraft.js` | Shared aircraft color and threshold constants |
| `src/utils/math.js` | Shared numeric helpers (`toFiniteNumber`) |
| `src/utils/airport.js` | Shared airport display helpers (`airportSubtitle`) |
| `src/data/airportFallbacks.js` | Fallback airport metadata and coordinates |

There is no standalone `src/services` or `src/server` layer. JSX belongs under `src/components/**`; mechanisms, models, clients, hooks, and feature-specific utils live inside the owning feature domain as plain `.js` modules, except for API DAOs and route-handler helpers under `src/app/api`.

## Styling — Tailwind first

This project uses **Tailwind CSS v4**. When adding or changing styles, reach for Tailwind utilities in JSX *before* writing custom CSS in `src/style.css`. Custom CSS is reserved for cases utilities can't express cleanly.

Decision order when styling something:

1. **Tailwind utility classes** in JSX (`flex`, `gap-2`, `text-[12px]`, `bg-atc-card`, etc.) — preferred default.
2. **Tailwind arbitrary values** (`bg-[var(--tone-card-soft)]`, `rounded-[var(--atc-radius-panel)]`) when a one-off needs an existing CSS variable.
3. **Custom CSS in `src/style.css`** only for things utilities can't do, e.g.:
   - Multi-layer gradient backgrounds and `color-mix()` blends.
   - `::before` / `::after` decorative pseudo-elements.
   - Theme-aware overrides under `[data-theme="..."]` selectors.
   - Animations (`@keyframes`) and `prefers-reduced-motion` blocks.
   - Leaflet/marker DOM that we don't own and can't pass classes to.

When you do write custom CSS, follow the existing DRY patterns:

- **Use the existing tokens.** `:root` defines `--atc-*` (theme colors) and `--tone-*` (composed `color-mix` blends like `--tone-card-soft`, `--tone-border-firm`, `--tone-orange-warm`). Reuse them instead of re-typing `color-mix(in oklab, var(--atc-card) 62%, transparent)`. If you need a new tone variant, add a token in `:root` rather than inlining it at the use site.
- **Merge selectors that share a declaration block** with comma-separated lists (e.g. `.search-row, .about-source { ... }`) — don't duplicate the rule.
- **Tailwind v4 quirks**: `normal-case` no longer exists; use `capitalize` (or rewrite the source text) when you need to override an inherited `uppercase`. Theme tokens declared in `@theme inline` at the top of `style.css` become utility classes (e.g. `bg-atc-card`); add new theme colors there if you want utility access.

Watch the dev server (`pnpm run dev`) for layout regressions after touching `style.css` — many panels share the same surface tokens, so a token edit ripples broadly by design.

## Build

```bash
pnpm build
```

## Tests

```bash
pnpm test
```

`pnpm test` auto-discovers every `*.test.js` file and runs the full critical mechanism suite. Keep tests focused on data normalization, proxy/routing/security, geometry, aircraft movement/context, and other logic that is hard to validate visually. Verify component behavior in the running app instead of adding one-off package scripts or copy/toggle-level tests.

Local UI verification:

```bash
pnpm run dev
```

Open `http://localhost:3000`. For pushed branches, use the Vercel preview deployment created by Git integration. Vercel's documented preview checks are `vercel list --environment preview`, `vercel inspect <preview-url>`, and `vercel curl / --deployment <preview-url>` when deployment protection applies.

## Runtime config

There is no Python backend runtime config, frontend settings page, or `/api/config` flow.

## Version and release rules

Vercel deploys every push to `main`, but a deployment is not automatically a product release. Do not bump `package.json` or create a Git tag just because a Vercel deployment happened.

Use the current ADSBao web release line:

| Version | Meaning |
|---|---|
| `v0.4.0` | Breaking ADSBao web pivot |
| `v0.5.0` | Vercel-first web architecture |
| `v0.6.0` | Vercel observability and production routing |
| `v0.7.0` | Flight route and traffic context |
| `v0.7.1` | Map and mobile polish |
| `v0.8.0` | Next.js Vercel refactor |
| `v0.9.0` | Navy tracking console redesign |
| `v0.10.0` | Global airport data layer (OurAirports + Supabase) and richer aircraft silhouettes |
| `v0.11.0` | Selected-aircraft trace + multi-provider failover + AeroDataBox revalidation |
| `v0.12.0` | Aircraft tracking page + airport-prefixed routes + polymorphic sidebar/preview |

`v0.3.x` and earlier are legacy desktop-app history. Do not use those releases as the current ADSBao web product line.

When preparing a new product release:

1. Decide the next SemVer-style version based on product meaning, not deploy count.
   - Minor: user-visible feature, architecture milestone, or substantial production behavior change.
   - Patch: bug fix, compatibility fix, or small UX correction.
   - No version bump: docs-only, screenshot-only, refactor-only, or routine dependency cleanup with no product-visible impact.
2. Update all visible version strings together:
   - `package.json`
   - `src/app/about/page.js`
   - `src/app/api/proxy/flight-routes/callsign/[callsign]/route.js` User-Agent, if still present
   - `src/config/changelog.js` (prepend a new entry; this is the source of truth — there is no `CHANGELOG.md` anymore)
   - `README.md`, only if it states the current version
3. Run `pnpm build` and the test command above before tagging.
4. Tag only after the release commit is on `main` and the Vercel production deployment is healthy.
5. Use an annotated tag for product releases:

```bash
git tag -a vX.Y.Z -m "vX.Y.Z - Short release title"
git push origin vX.Y.Z
```

6. GitHub Release notes should summarize product changes from `src/config/changelog.js`. Do not recreate the old Homebrew cask auto-release flow.
