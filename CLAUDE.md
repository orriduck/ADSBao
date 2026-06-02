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
| `src/config/changelog.ts` | Product release history (source of truth; renders the `/changelog` page) |
| `docs/architecture.md` | Current Vercel web architecture and data-path notes |
| `package.json` | App metadata, scripts, dependencies, and current product version |
| `next.config.ts` | Next.js config and local proxy rewrites |
| `vercel.json` | Vercel build command and production rewrites |
| `src/app/page.tsx` | Search route entry |
| `src/app/[icao]/page.tsx` | Airport route entry |
| `src/app/api/proxy/flight-routes/callsign/[callsign]/route.ts` | Next.js Route Handler for callsign route lookup |
| `src/components/screens/SearchScreen.tsx` | Thin route entry for airport search UI |
| `src/components/screens/AirportCaptionScreen.tsx` | Thin route entry for airport explorer map + METAR screen |
| `src/components/about/*` | About-page JSX components |
| `src/components/aircraft/*` | Aircraft preview and trace JSX components |
| `src/components/airport/*` | Airport explorer and search JSX components |
| `src/components/map/*` | Leaflet map JSX components and map controls |
| `src/components/weather/*` | Weather slide JSX components and view hooks |
| `src/app/api/_shared/*` | Route-handler-only helpers for validation, rate limits, upstream fetches, and API responses |
| `src/app/api/dao/*.dao.ts` | Persistence boundary for Supabase/SQL reads and writes |
| `src/features/aircraft/*` | Aircraft filters, icons, photos, positions, preview, and trace logic |
| `src/features/airport/*` | Airport context, directory, explorer, map, nearby, procedures, search, and wiki logic |
| `src/features/aviation/*` | Aviation provider clients and flight-route mechanisms |
| `src/features/weather/*` | Weather models and METAR mechanisms |
| `src/features/about/*` | About-page view models |
| `src/features/app-shell/*` | Theme preference state and helpers |
| `src/hooks/*.ts` | React hooks for METAR, ADS-B positions, route lookups, wiki summaries, and scroll parallax |
| `src/constants/aircraft.ts` | Shared aircraft color and threshold constants |
| `src/utils/math.ts` | Shared numeric helpers (`toFiniteNumber`) |
| `src/utils/airport.ts` | Shared airport display helpers (`airportSubtitle`) |
| `src/data/airportFallbacks.ts` | Fallback airport metadata and coordinates |

There is no standalone `src/services` or `src/server` layer. TSX belongs under `src/components/**`; mechanisms, models, clients, hooks, and feature-specific utils live inside the owning feature domain as plain `.ts` modules, except for API DAOs and route-handler helpers under `src/app/api`.

## Styling — Tailwind first

This project uses **Tailwind CSS v4**. When adding or changing styles, reach for Tailwind utilities in JSX *before* writing custom CSS in `src/style.css`. Custom CSS is reserved for cases utilities genuinely can't express. The default answer is "put it on the component."

### Decision order

1. **Tailwind utility classes** in JSX (`flex`, `gap-2`, `text-[12px]`, `bg-atc-card`, etc.).
2. **Tailwind arbitrary values** for one-offs that need an existing CSS variable (`bg-[color-mix(in_oklab,var(--atc-card)_82%,transparent)]`, `rounded-[var(--atc-radius-panel)]`, `min-h-[76px]`, `grid-rows-[11px_minmax(27px,auto)_10px]`).
3. **Tailwind variants** for state, child, pseudo, and ancestor styling (see "Variants you should reach for first" below).
4. **`cva` + `cn` in a primitive component** (`src/components/ui/*.tsx`) for anything reused across pages — co-locate state variants and tokens with the TSX.
5. **Custom CSS in `src/style.css`** only when utilities cannot express the result. Realistic exceptions:
   - DOM we don't own and can't pass classes to (Leaflet `divIcon` HTML, Clerk's `.cl-*` shadow DOM, third-party widgets).
   - `@keyframes` definitions and `prefers-reduced-motion` blocks.
   - `[data-theme="..."]` overrides that have to live above the cascade (`:root[data-theme="dark"] .x { ... }`).
   - Multi-rule structural CSS for legacy class-named subsystems (table rows, search inputs, popovers) that haven't been migrated to a primitive yet.

A pseudo-element (`::before` / `::after`) is **not** an automatic reason to write CSS — Tailwind v4 supports `before:` / `after:` variants. Use those first.

### Variants you should reach for first

Tailwind v4 expresses most "context overrides" without leaving JSX. The patterns this codebase already uses:

- **Pseudo-elements** — `before:content-[''] before:absolute before:inset-0 before:[background:var(--sidebar-tile-bottom-glow)]`. Use the `background` shorthand (in `[...]`) when the token is a gradient; `bg-[...]` compiles to `background-color` which can't accept a gradient. See `MetricCard.tsx`.
- **Ancestor selectors** — `[.airport-map-kit_&]:min-h-[76px]` compiles to `.airport-map-kit .target { min-height: 76px }`. Use this for context-specific compact / spacious variants instead of writing `.airport-map-kit .my-card { ... }` in `style.css`. The `_` stands in for a space.
- **Group / data attributes** — `data-[active=true]:bg-[var(--atc-click-bg)]`, `data-[state=open]:shadow-[...]`, `group-data-[active=true]:text-[var(--atc-click-fg)]`. Use these instead of `.my-card[data-active="true"] { ... }`.
- **Compound ancestor + state** — `[[data-active=true]_&]:text-[var(--atc-click-muted)]` flips a child when any ancestor is active. Use this when the parent isn't tagged with `class="group"` (e.g. Radix's `SelectTrigger`, which drops props through `asChild`).
- **Direct-child / descendant** — `[&>svg]:absolute [&>svg]:right-3` pins a SelectTrigger's chevron. Same for `[&_strong]:text-[24px]` when targeting structural children.
- **Combining variants** — `[.airport-map-kit_&]:[&>svg]:right-2` (ancestor + direct child), `data-[state=open]:[&>svg]:text-[var(--atc-click-muted)]` (state + descendant). All compose without quoting issues as long as each fragment is a single literal class string Tailwind can extract.

### Variants gotchas

- Tailwind extracts class names statically from your source. **Do not build classes with string concatenation or `replaceAll`** — those don't appear in the safelist and won't compile. Every Tailwind class must exist as a literal string somewhere in a `.tsx` / `.ts` file.
- `tailwind-merge` (via `cn()`) collapses conflicting utilities. When a `cva` base has `px-[14px]` and a variant adds `pr-7`, the result is `pl-[14px] pr-7` — predictable, but verify with devtools when in doubt.
- `[class*="uppercase"]` global overrides exist in `style.css`; check before relying on `uppercase` rendering as literal CAPS.
- `pointer-events: none` on a parent (`.airport-map-menu--mobile`, `.sidebar-top-dock`, `.page-nav-dock`) requires the floating pill to opt back in with `pointer-events-auto`. The `Toolbar` primitive already does this; new floating-pill components inside those containers must too.

### When you would have written CSS — try this instead

- "I need a 4px bottom-edge glow on the active state." → `data-[active=true]:shadow-[inset_0_-1px_0_var(--sidebar-tile-edge-glow),inset_0_-12px_20px_color-mix(in_oklab,var(--atc-click-fg)_7%,transparent)]` on the cva base.
- "The card should be smaller inside the map kit." → `[.airport-map-kit_&]:min-h-[76px] [.airport-map-kit_&]:p-[14px]` on the card, not `.airport-map-kit .my-card { padding: 14px }` in `style.css`.
- "I need a chevron pinned to the right." → `[&>svg]:absolute [&>svg]:right-3 [&>svg]:top-1/2 [&>svg]:-translate-y-1/2` on the parent.
- "The active filter should have no border." → `data-[active=true]:border-transparent`, not `.my-filter[data-active="true"] { border: 0 }`.

### When `style.css` is the right answer

- Global `@theme inline` token declarations and `:root` / `:root[data-theme]` variable definitions.
- `@keyframes` (e.g. `.toolbar-reveal`) plus `prefers-reduced-motion`.
- Selectors that have to win over a third-party stylesheet (Clerk, Leaflet, Radix popover layers) where we can't add classes to the rendered element.
- Container-level positioning wrappers that pre-exist and just hold the layout — `.airport-map-kit`, `.airport-map-menu`, `.sidebar-top-dock`, `.page-nav-dock`, `.map-ctrl-zone`. These keep their CSS because they wrap structure, not visual state.

If you find yourself adding more than ~5 lines of CSS for a component you control, stop and convert it to inline variants instead. The recent `Toolbar` / `MetricCard` / `FilterCard` primitives replaced ~1000 lines of `style.css` with inline Tailwind by following this rule.

When custom CSS is genuinely warranted, follow the existing DRY patterns:

- **Use the existing tokens.** `:root` defines `--atc-*` (theme colors) and `--tone-*` (composed `color-mix` blends). Reuse them instead of re-typing `color-mix(in oklab, var(--atc-card) 62%, transparent)`. If you need a new tone, add a token in `:root` rather than inlining it at the use site.
- **Merge selectors that share a declaration block** with comma-separated lists.
- **Tailwind v4 quirks**: `normal-case` no longer exists; use `capitalize`. Theme tokens declared in `@theme inline` at the top of `style.css` become utility classes (e.g. `bg-atc-card`); add new theme colors there for utility access.

Watch the dev server (`pnpm run dev`) for layout regressions after touching `style.css` — many panels share the same surface tokens, so a token edit ripples broadly by design.

## Build

```bash
pnpm build
```

## Tests

```bash
pnpm test
```

`pnpm test` auto-discovers every `*.test.ts` and `*.test.tsx` file and runs the full critical mechanism suite. Keep the suite intentionally small and high-signal.

### What belongs in unit tests

Add or update tests when they protect durable behavior that is hard to validate by looking at the app:

- data normalization and display-model helpers
- provider selection, failover, caching, rate-limit, and proxy/security behavior
- route lookup, trace geometry, map math, aircraft movement/context, and distance calculations
- state-machine behavior such as selected entities, layer defaults, feature flags, user-location modes, and loading models
- reusable formatters or utilities with edge cases

### What does not belong in unit tests

Do not create or preserve tests whose main job is to lock down visual implementation details. Prefer local browser verification for these:

- exact Tailwind class strings, CSS declarations, spacing, widths, icons, or DOM layout structure
- source-inspection tests that read `.tsx` or `style.css` and assert regex matches for component markup
- snapshot-style coverage of UI cards, map controls, drawers, copy placement, hover states, or responsive layout
- one-off tests for routine UI copy, toggles, labels, or presentation-only component wiring
- duplicate tests that cover behavior already protected by a model, utility, provider, or API test

If a UI change needs durable logic coverage, extract the decision into a plain model/helper under the owning `src/features/**` domain and test that helper. Otherwise, validate the rendered behavior in the running app. Do not add tests just because a file changed.

Local UI verification:

```bash
pnpm run dev
```

Open `http://localhost:3000`. For pushed branches, use the Vercel preview deployment created by Git integration. Vercel's documented preview checks are `vercel list --environment preview`, `vercel inspect <preview-url>`, and `vercel curl / --deployment <preview-url>` when deployment protection applies.

## Validation modes

Use this decision tree for Claude Code, Codex, ChatGPT, and any other agent working in this repository. Pick the lightest validation mode that actually covers the change. Do not run broad checks just because a file changed, but do escalate when the change affects production behavior, shared mechanisms, or multiple visible surfaces.

### Mode 1: Docs/copy only

Use for wording-only changes where runtime behavior is not affected.

Examples:

- README, `CLAUDE.md`, `AGENTS.md`, issue templates, or architecture prose.
- Copy-only changes to labels, help text, or comments when no logic, route, style, or component structure changes.
- Config text that documents behavior without changing the effective runtime value.

Validation:

- Read the changed text in context.
- Confirm links, commands, and file references are still accurate.
- No browser, Vercel preview, or full test run is required unless the docs describe a command or flow that was also changed.

PR wording:

```text
Validation: docs/copy only — read the updated agent guide in context.
```

### Mode 2: Local browser validation

Use for small frontend changes that are best judged visually or interactively.

Examples:

- Layout, spacing, icon, toggle, animation, hover, or visible interaction polish.
- Small map controls, preview-card alignment, loading indicators, and responsive adjustments limited to one surface.
- PR #319-style UI/card polish when it is contained to a small set of screens.

Validation:

- Use the local dev server on `http://localhost:3000`, following the dev-server lifecycle above.
- Open the affected route in a browser and verify the actual interaction or visual state.
- Check both desktop and mobile widths when the changed surface is responsive.
- Use Vercel preview only when production comparison, auth state, or a wider screen matrix is needed.

PR wording:

```text
Validation: local browser — checked <route or screen> at <viewport/state>.
```

### Mode 3: Local test validation

Use for deterministic mechanism, model, data, or API behavior where tests give stronger coverage than visual inspection.

Examples:

- Normalization, provider selection, route lookup, trace geometry, user-location audio state, map-layer models, loading-state models, and cache/security helpers.
- UI plus state/model changes where visible behavior depends on nontrivial logic.
- PR #325-style mixed UI/model changes: run relevant tests first, then add browser validation for the visible behavior.

Validation:

- Add or update focused tests for the changed mechanism when useful.
- Run the narrow relevant test file first, then `pnpm test` when the change touches shared behavior or multiple mechanisms.
- Add local browser validation when the tested behavior also has a visible user workflow.

PR wording:

```text
Validation: local test — ran <test command>; local browser checked <visible workflow if applicable>.
```

### Mode 4: Vercel preview validation

Use for broad frontend changes or production-facing behavior that needs the deployed environment.

Examples:

- Major map UI changes, responsive rewrites, theme/design-token changes, cross-page shell/navigation changes, or changes that span many screens.
- Data/provider/API/backend changes that depend on Vercel routing, environment variables, deployment headers, or production proxy behavior.
- Env, dependency, migration, or internal feature-flag changes where the default user-facing behavior must be stated.
- PR #320-style OpenAIP/provider migrations and broad production data-path work.

Validation:

- Run the relevant local tests and project checks before final review.
- Push the branch and use the Vercel preview URL generated for the PR as the verification target.
- Inspect the preview route or API behavior that matches the changed surface.
- For FlightAware-related features, merge the work and verify with Chrome after merge because the flow depends on Clerk login state.

PR wording:

```text
Validation: Vercel preview — checked <preview URL or route>; ran <local commands>.
```

### Risk mapping

- Tiny docs/copy/config-text changes: Mode 1.
- Visual-only UI polish: Mode 2; escalate to Mode 4 only when many screens or production comparison are involved.
- UI plus state/model behavior: Mode 3 plus Mode 2 when the behavior is visible.
- Data/provider/API/backend changes: Mode 3 plus project checks; escalate to Mode 4 when Vercel routing or deployed configuration matters.
- Env/dependency/migration/internal feature flag changes: Mode 3 plus project checks, with a PR note about default user-facing behavior; use Mode 4 when the deployed environment is part of the change.

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
   - `src/app/about/page.tsx`
   - `src/app/api/proxy/flight-routes/callsign/[callsign]/route.ts` User-Agent, if still present
   - `src/config/changelog.ts` (prepend a new entry; this is the source of truth — there is no `CHANGELOG.md` anymore)
   - `README.md`, only if it states the current version
3. Run `pnpm build` and the test command above before tagging.
4. Tag only after the release commit is on `main` and the Vercel production deployment is healthy.
5. Use an annotated tag for product releases:

```bash
git tag -a vX.Y.Z -m "vX.Y.Z - Short release title"
git push origin vX.Y.Z
```

6. GitHub Release notes should summarize product changes from `src/config/changelog.ts`. Do not recreate the old Homebrew cask auto-release flow.
