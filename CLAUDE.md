# ADSBao — Claude Code Guide

## Dev environment

Start the frontend:

```bash
pnpm run dev
```

Frontend runs on `http://localhost:3000` by default.

## Stack

- **Frontend**: React + Next.js App Router + Tailwind CSS v4 + DaisyUI, managed by `pnpm`.
- **Airport data**: Airport directory and route lookup are fetched live from public aviation sources with frontend caching where appropriate.
- **Weather/traffic data**: Web deployment uses Vercel data paths under `/api/proxy/*` because AviationWeather, adsb.lol, and route lookups need same-origin handling for production browser use. Local Next.js dev uses equivalent rewrites where possible.
- **Removed scope**: Live audio/transcription, desktop packaging, Homebrew cask publishing, and Python backend runtime config are no longer part of this repository.

## Key paths

| Path | What |
|---|---|
| `CHANGELOG.md` | Product version history and legacy release split |
| `docs/architecture.md` | Current Vercel web architecture and data-path notes |
| `package.json` | App metadata, scripts, dependencies, and current product version |
| `next.config.mjs` | Next.js config and local proxy rewrites |
| `vercel.json` | Vercel build command and production rewrites |
| `src/app/page.js` | Search route entry |
| `src/app/[icao]/page.js` | Airport route entry |
| `src/app/api/proxy/flight-routes/callsign/[callsign]/route.js` | Next.js Route Handler for callsign route lookup |
| `src/components/screens/SearchScreen.jsx` | Thin route entry for airport search UI |
| `src/components/screens/AirportCaptionScreen.jsx` | Thin route entry for airport explorer map + METAR screen |
| `src/features/*` | Feature-owned UI orchestration, state hooks, and pure model helpers |
| `src/hooks/*.js` | React hooks for METAR, ADS-B positions, route lookups, wiki summaries, and scroll parallax |
| `src/services/airportDirectory.js` | Public compatibility barrel for airport directory clients |
| `src/services/airport-directory/*` | Airport directory client, cache, and query/normalization model |
| `src/services/aviationData.js` | Public compatibility barrel for aviation data clients |
| `src/services/aviation/*` | Frontend-owned aviation provider clients, proxy models, rate limiter, and normalizers |
| `src/constants/aircraft.js` | Shared aircraft color and threshold constants |
| `src/utils/math.js` | Shared numeric helpers (`toFiniteNumber`) |
| `src/utils/airport.js` | Shared airport display helpers (`airportSubtitle`) |
| `src/data/airportFallbacks.js` | Fallback airport metadata and coordinates |

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
   - `CHANGELOG.md`
   - `README.md`, only if it states the current version
3. Run `pnpm build` and the test command above before tagging.
4. Tag only after the release commit is on `main` and the Vercel production deployment is healthy.
5. Use an annotated tag for product releases:

```bash
git tag -a vX.Y.Z -m "vX.Y.Z - Short release title"
git push origin vX.Y.Z
```

6. GitHub Release notes should summarize product changes from `CHANGELOG.md`. Do not recreate the old Homebrew cask auto-release flow.
