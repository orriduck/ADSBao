# Design — Liquid Glass Material System

This file is the source of truth for ADSBao's visual language. Any agent or
model doing UI work must follow it. The implementation lives in two places:

- **Tokens**: `src/style.css` — search for `--atc-glass-`, `--atc-control-`,
  `--app-frost`, `--atc-click-`. Every material below is a token; change the
  token, never re-type a recipe at a use site.
- **Reference components**: `src/components/ui/MetricCard.tsx`,
  `FilterCard.tsx`, `SelectableCard.tsx`, `Toolbar.tsx`. New selected/resting
  surfaces should copy their class patterns, not invent new ones.

## Overview

ADSBao is a map-first tracking console wearing Apple's "Liquid Glass"
material language (iOS 26 / macOS Tahoe era). Every floating surface is a
piece of glass over the live map: bright milky frosted glass at rest, and a
polished glass capsule when selected. The mood is premium travel hardware —
soft light, deep blur, crisp dark type — not flat SaaS cards and not game UI.

There are exactly **two materials**. Do not invent a third.

## Material 1 — Selected: the glass capsule

Used ONLY for selected/active states: selected metric cards (tabs), active
filter chips, open select triggers, selected settings option cards, pressed
toolbar buttons. All of it derives from three tokens in `src/style.css`:
`--atc-glass-active-bg`, `--atc-glass-sheen`, `--atc-glass-rim-shadow`, plus
`--atc-glass-active-frost` for the backdrop blur.

Anatomy (see the tokens for exact numbers):

- **Ink layer** — a radial falloff anchored at the TOP-LEFT corner: the
  capsule stays ~95-98% opaque `--atc-click-bg` almost everywhere and only
  the far bottom-right corner dissolves to ~30%, so the backdrop-blurred
  surface behind glows through that one corner. This corner dissolve is the
  signature of the material; keep it.
- **Bottom bloom** — a faint white radial glow rising from below the bottom
  edge (~8% white).
- **Top-light sheen** — a `::after` overlay with a smooth VERTICAL falloff
  (12% white at top → transparent by ~62%), fading/sliding in over ~300ms on
  selection. Never a diagonal band: at card size a diagonal highlight reads
  as a smudge across the content.
- **Rim** — `border-color: transparent` on active; the edge comes from light:
  a crisp specular top hairline (inset 0 1px), a faint 1px glass ring, a
  bottom catch-light, and a deep soft drop shadow tinted with the click color.
- **Backdrop frost** — `saturate(0.85) blur(14px)` on the tile itself.
  Desaturated on purpose: boosting saturation drags the basemap's colors
  through the translucent ink and tints the glass murky.

Text on the capsule: `--atc-click-fg`; secondary text `--atc-click-muted`.

### Theme polarity (important)

The capsule derives entirely from the `--atc-click-bg` / `--atc-click-fg`
pair, and the pair flips per theme:

- **Light theme**: selected = DARK smoke capsule (near-black ink, near-white
  text) on the bright milky panel.
- **Dark theme**: selected = BRIGHT white-glass capsule (luminous, dark ink
  text) on the near-black shell.

To retune the selected look for one theme, change that theme's click pair —
do not fork the `--atc-glass-*` recipes per theme.

## Material 2 — Resting: milky frosted glass

Everything at rest: cards, tiles, toolbar pills, floating chrome, menus.
Bright, near-opaque, crisp dark content (iOS Mail toolbar look).

- Surfaces: `--atc-control-surface` (74% frost tint), `-muted` (66%),
  `-hover` (88%), toolbars `--atc-toolbar-surface` (92%). The tint base is
  `--app-frost-tint` (cool near-white in light theme, deep gray in dark).
- Backdrop blur: shared `--app-frost` (`saturate(1.04) blur(12px)`), strong
  variant `--app-frost-strong` (16px).
- Definition comes from LIGHT, not strokes: `--atc-control-inset-shadow`
  (luminous top rim + soft ring + gentle lift shadow). Borders stay
  near-invisible (`--sidebar-tile-rest-border`, `--app-frost-border`).
- In dark theme the white rims swap to `--atc-text`-based catch-lights and
  shadows deepen (see the `:root[data-theme="dark"]` overrides) — literal
  white rims on dark glass read as wire outlines.
- Icons/labels on glass are crisp and dark (`text-atc-dim` or stronger), not
  faint gray.

## Color

OKLCH for new tokens. Never pure black or pure white. The palette is
near-monochrome: warm paper-gray canvas, near-black ink, with color coming
from the map itself and from small signals (`--atc-red` destructive,
`--atc-mint` ok-state). `--atc-orange` aliases the primary for warm accents.
Default theme is light; dark theme is the night-ops counterpart of the same
system, not a different design.

## Shape

Soft, capsule-driven geometry:

- Floating toolbars and buttons: full pills (`--atc-radius-pill`: 999px).
- Cards and tiles: `--atc-radius-card` (18px desktop; compact contexts
  override it smaller).
- Panels/shell: `--atc-radius-panel` (18px) and `--atc-radius-shell` (32px).

## Typography

Sans stack (Google Sans Flex / Manrope style) for product text; tabular
figures for telemetry. Compact uppercase micro-labels (10px bold) over large
black numerals is the metric-card signature. No display fonts in operational
UI.

## Motion

150-250ms ease-out for state changes. The capsule's sheen overlay animates
opacity/transform only; respect `prefers-reduced-motion`. Do not animate
layout properties.

## Rules for modifying this system

1. **Change tokens, not call sites.** If a card looks wrong, fix
   `--atc-glass-*` / `--atc-control-*` in `src/style.css`. Every selected
   surface shares one definition by design.
2. **Tailwind-first.** Styling lives inline on components via utilities and
   arbitrary values (`[background:var(--atc-glass-active-bg)]`). See
   `CLAUDE.md` → "Styling — Tailwind first" for the decision order and
   variant patterns. Gradients must go through the `background` shorthand —
   `bg-[...]` compiles to `background-color` and silently drops gradients.
3. **Hover must not flatten the capsule.** `hover:bg-*` sets
   `background-color`, which fights the active `background` shorthand. Any
   element with both needs an explicit
   `data-[active=true]:hover:[background:var(--atc-glass-active-bg)]`.
4. **Keep the capsule dark/bright enough.** Below ~80% ink opacity outside
   the dissolve corner, the glass turns muddy against the opposite-polarity
   background. The glass feel comes from blur + rim + bloom, not heavy
   transparency.
5. **Verify in a real browser, both themes**, against a busy map background:
   look for gray mud at capsule bottoms, color tint pulled through the
   frost, double edges (border + rim), and smudges across content.
6. **Skills that restyle UI** (impeccable, frontend-design, shadcn theming,
   etc.) must treat this file as the project design context and extend the
   two materials instead of introducing flat fills, hard borders, or new
   surface treatments.
