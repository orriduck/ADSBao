# Design

## Overview

ADSBao uses an Endfield-inspired industrial operations console language built from bright yellow, light gray, and near-black. The interface should feel like an operational manual laid over a live airport map: compact controls, thin technical dividers, hard-edged panels, and map-first composition. The goal is not game UI mimicry; it is a restrained product interface with a science-fiction field terminal mood.

## Color

Use OKLCH for new tokens whenever possible. Never use pure black or pure white; near-black and tinted light gray carry the requested black and gray feel without harsh clipping. The default theme is dark because the primary use scene is a map-heavy operations surface read on desktop or mobile in low to moderate ambient light. Light mode should remain supported as an operational manual mode. Both themes use the same three-color family, but swap which color is primary.

### Dark Theme

- `--atc-bg`: near-black operations canvas.
- `--atc-card`: dark graphite panel surface.
- `--atc-elev`: raised charcoal control surface.
- `--atc-high`: selected or strongly raised surface.
- `--atc-accent`: bright yellow for selection, active rail items, and precise labels.
- `--atc-orange`: bright yellow alias for operational emphasis and warnings.
- `--atc-mint`: muted yellow-gray signal-ok feedback.
- `--atc-red`: destructive and error state only.

### Light Theme

Light mode should stay high-contrast and utilitarian: light gray manual-paper surfaces, near-black ink, muted gray dividers, and bright yellow for selected controls or active operational state. It should not drift into cream, beige, blue console styling, or generic white SaaS styling.

### State Color

Clicked or selected controls use a near-black surface with yellow text. In dark theme, keep the surface black and soften the text to pale yellow so active controls read like lit instrument buttons on a black console. Focused controls use a near-white gray surface with yellow edge treatment and black text, matching the screenshot's white/yellow current-component language without changing the existing click flow.

## Typography

Use the existing Google Sans Flex / Manrope-style sans stack for product text and JetBrains Mono for identifiers, telemetry, METAR fragments, aircraft IDs, runway labels, and control microcopy. Avoid display fonts in operational UI. Prefer compact uppercase labels only for short categories and keep letter spacing subtle.

## Shape

Controls and panels use a sharper industrial vocabulary:

- Panels: 4px radius or less.
- Controls: 2px radius or less.
- Pills are allowed only for chips, tiny status capsules, and route tags.
- Avoid nested cards. Use separators, banded sections, and panel headers instead.

## Surfaces

Panels should read as layered metal or terminal glass without decorative blur. Use subtle linear gradients, inset highlights, hairline borders, and grid/noise overlays sparingly. Shadows should be shallow and tinted toward the canvas, not generic black drops.

## Components

- Sidebar: dense mission-console panel with clear section rhythm, strong active states, and compact telemetry.
- Map controls: fixed-size icon controls, tooltips for icon-only actions, active state as black/yellow lit instrument buttons.
- Preview cards: operational inspection panels, not marketing cards.
- Search and about screens: retain the existing flow, but align their panels, buttons, inputs, and background atmosphere with the same industrial system.
- Toasts: concise operational notifications, top-right placement, no excessive animation.

## Motion

Use 150-250ms transitions with exponential ease-out. Motion should indicate reveal, selection, loading, or focus change. Do not animate layout properties, and respect `prefers-reduced-motion`.

## Implementation Notes

Prefer Tailwind utilities in JSX for component-local adjustments. Use `src/style.css` for shared theme tokens, Leaflet DOM overrides, pseudo-elements, and global surface effects. Preserve existing layout and click flow unless a visual fix requires a local spacing correction.
