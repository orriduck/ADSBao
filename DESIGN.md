# Design — Operational Wayfinding System

This file is the source of truth for ADSBao's visual language. The interface
borrows from airport and transit wayfinding: information must be understood at
a glance, at distance, and under pressure. It is an operational sign system,
not a collection of decorative cards.

## Core principles

1. **Lead with the identifier.** Callsigns, IATA/ICAO codes, headings, and live
   numeric values are the primary landmarks. Full names and descriptions are
   secondary.
2. **Create hierarchy with size and placement.** Keep the existing product
   typeface. Use larger numeric/Latin identifiers, smaller labels, and stable
   baselines instead of stretched type, gratuitous weight changes, or duplicate
   copy.
3. **Keep content concise.** A label should appear once. Remove decorative
   totals and metadata that do not help the next decision.
4. **Use color as a code.** Color identifies a subject, state, or destination;
   it is never an all-purpose decoration.
5. **Align the whole system.** Shared edges matter more than the outline of an
   individual component. Adjacent rows meet on the same vertical and horizontal
   axes, with a single hairline between them.

## The wayfinding module

Fixed sidebars and in-flow information panels use one repeating construction:

- A **36px full-height rail** holds one small 16px icon. The icon sits 10px from
  the left and 11px from the top; it is intentionally not vertically centered.
- Railed content begins at **48px** from the sidebar edge (36px rail + 12px
  inset). Content without a rail begins at **14px**.
- The content surface is **pure white in light mode and pure black in dark
  mode**. Do not alternate black/white within one theme.
- The main and secondary areas share the same rail width. Importance comes from
  type scale, row height, and ordering — never from a wider rail.
- Joined modules use one 1px neutral divider. Avoid doubled borders, inset card
  margins, rounded mini-cards, gradients, and shadows inside the fixed sidebar.

The reference implementation is `src/components/ui/WayfindingMetric.tsx` and
the airport/flight sidebars in `src/components/sidebar/`.

## Color semantics

Each tracked entity or page context owns one primary theme color. ADSBao uses:

- **Orange** (`--atc-signal-accent`) is the scarce highest-priority signal. Use
  it only for the current airport/aircraft identity, the selected tracking
  target, live trace, or the single primary tracking action in a context.
- **Blue** (`--atc-signal-secondary-action`, with
  `--airport-wayfinding-secondary` as the tracking-sidebar alias) marks
  secondary interaction or a distinct alternate context: external provider
  rows, expanded secondary controls, contextual map previews, and
  alternate-unit metric states.
- **Dark and light neutral gray** express structure and ordinary information:
  static page identities, section and group headers, metrics, search, filters,
  loading placeholders, unselected list rows, and non-interactive status.

Do not promote a rail to orange merely because it starts a page or is the
newest item in a list. Before adding orange, ask whether the element identifies
what the user is actively tracking or performs the one primary action. If not,
use blue for secondary interaction and gray for everything else.

Map preview cards are glance surfaces, not tracking pages: their identity rail
stays neutral gray, and orange is reserved for the single primary action
(Track) and for the identity hero of the tracking page that action leads to.

Only the rail or an entire secondary action row receives color. Text content
stays on the neutral content surface; never put contrasting text blocks inside
a metric merely to make it colorful.

## Typography and data

- Keep the established sans family; do not condense or stretch it.
- Callsigns and IATA/ICAO identifiers lead. Directory rows show IATA on line
  one and the airport's full name on line two.
- Labels are quiet and compact. Values are larger, tabular where appropriate,
  and aligned to a common baseline.
- A metric may switch representations when clicked (for example kt / km/h or
  ft / m). The alternate representation uses the blue rail so the state change
  is visible without recoloring the content area.

## Lists, filters, and previews

- Search, filters, and nearby rows continue the same 36px rail and 48px content
  axis. They are full-width joined rows, not floating capsules.
- Nearby aircraft remain a dense operational manifest: one row per target,
  neutral rail at rest, orange rail when selected, stable columns for distance
  and altitude.
- Map preview cards behave like compact signs: flat neutral body, one identity
  rail, strong identifier, concise telemetry, and a full-width action row.
- Map labels are allowed a compact 4px signal strip because a 36px rail would
  obscure geography. Their color meanings must match the sidebar.

## Floating and blocking surfaces

The wayfinding module applies to fixed/in-flow information. Floating map
toolbars, menus, popovers, sheets, and dialogs may continue to use the existing
frosted material tokens (`--atc-glass-*`, `--atc-control-*`, `--app-frost*`) so
the live map remains visible and interaction layers are spatially distinct.
Do not introduce a third surface recipe.

## Shape and motion

- Floating preview cards keep a soft outer radius so they read as elevated
  surfaces over the map, echoing the toolbar's pill geometry.
- Floating toolbars: pill geometry remains appropriate.
- Motion lasts 150–250ms, uses opacity/transform only, and respects
  `prefers-reduced-motion`. Motion should confirm a change or preserve spatial
  context, never delay reading.

### First-screen rail-stage motion

Home, About, Mechanism, and Changelog treat the 36px rail as an independent
signal stage. Its background and the adjacent reading surface paint
immediately; page panels, sections, rows, and text do not translate together.
Only the icon, code, sequence number, or status mark inside the rail may perform
a short 150–250ms opacity/transform micro-motion.

- Rail motion is owned by `[data-motion-rail]` and its glyph, never by the
  surrounding row or content column.
- Identity, search, navigation, code, data-source, sequence, and status glyphs
  may use distinct variants of one restrained arrival grammar.
- Hover/focus feedback remains inside the rail stage so content baselines stay
  fixed.
- Search-state changes may remount and replay the relevant rail glyph; live
  data refreshes must not replay the whole page.
- Reduced-motion users receive the same static rail and content with no
  animation or transform transition.

## Visual review checklist

Before shipping, inspect every affected sidebar in both themes and verify:

1. the sidebar width is unchanged;
2. all rails are exactly 36px and all railed content starts at 48px;
3. icons and titles share the intended top baseline, while titleless values
   align to the value baseline;
4. adjacent 1px dividers do not overlap into a visually thick line;
5. one context uses one primary color, with blue only for secondary/alternate
   meaning;
6. light content is white and dark content is black;
7. every label appears once and every visible total helps an immediate task.
