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
  mode**. Do not alternate black/white within one theme. Tracked-airport and
  tracked-aircraft identities are the sign exceptions: white rail with black
  glyph, followed by a yellow content field with black type in both themes.
- The main and secondary areas share the same rail width. Importance comes from
  type scale, row height, and ordering — never from a wider rail.
- Joined modules use one 1px neutral divider. Avoid doubled borders, inset card
  margins, rounded mini-cards, gradients, and shadows inside the fixed sidebar.

The reference implementation is `src/components/ui/WayfindingMetric.tsx` and
the airport/flight sidebars in `src/components/sidebar/`.

## Color semantics

ADSBao uses a grayscale wayfinding palette with tightly scoped yellow identity
and action exceptions:

- **Yellow** (`--atc-theme-yellow`) belongs only to the current tracked identity
  sign (airport or aircraft), the focal airport map label, and the single
  primary Track button in an aircraft preview. It does not identify aircraft
  selection or live trace.
- **Deep blue** belongs only to the compact external-provider link strip. It
  uses white copy and white provider marks in both themes, like a permanent
  airport information sign rather than a theme-dependent control.
- **Signal gray** (`--atc-signal-accent`) marks selected aircraft, live trace,
  and the primary tracking action without adding another hue.
- **Medium gray** (`--atc-signal-secondary-action`, with
  `--airport-wayfinding-secondary` as the tracking-sidebar alias) marks
  secondary interaction or a distinct alternate context: expanded secondary
  controls, contextual map previews, and alternate-unit metric states.
- **Dark and light neutral gray** express structure and ordinary information:
  static page identities, section and group headers, metrics, search, filters,
  loading placeholders, unselected list rows, and non-interactive status.

Do not use yellow outside the two airport-identity surfaces and the primary
Track CTA, or deep blue outside the external-provider strip. Use signal gray
for aircraft selection and trace, medium gray for secondary interaction, and
neutral gray for everything else.

Loading placeholders mirror the surface they replace: airport and tracked-
aircraft identity placeholders use the white-rail/yellow-field pairing, and
the provider-strip placeholder uses deep blue with white marks. All other
placeholders stay neutral gray.

Map preview cards are glance surfaces, not tracking pages: their identity rail
stays neutral gray, while the single primary Track action uses yellow with
black text.

Only tracked identity content, the focal airport map label, and the primary
Track CTA receive yellow. Other text content stays on the neutral surface;
never put contrasting text blocks inside a metric merely to make it colorful.

## Typography and data

- Keep the established sans family; do not condense or stretch it.
- Callsigns and airport identifiers lead. Airport codes display IATA-first
  (the three-letter public code) with ICAO/local codes as fallback when no
  IATA code exists.
- Labels are quiet and compact. Values are larger, tabular where appropriate,
  and aligned to a common baseline.
- A metric may switch representations when clicked (for example kt / km/h or
  ft / m). The alternate representation uses the medium-gray rail so the state
  change is visible without recoloring the content area.

## Lists, filters, and previews

- Search, filters, and nearby rows continue the same 36px rail and 48px content
  axis. They are full-width joined rows, not floating capsules.
- Selected filters stay neutral: change only the gray rail luminance (darker in
  light mode, lighter in dark mode). Medium gray remains reserved for a distinct
  secondary context, not ordinary filter state.
- Nearby aircraft remain a dense operational manifest: one row per target,
  neutral rail at rest, signal-gray rail when selected, stable columns for distance
  and altitude.
- Map preview cards behave like compact signs: flat neutral body, one identity
  rail, strong identifier, concise telemetry, and a full-width action row.
- The current-airport map label uses a compact yellow field with black ink and
  a thick white rail on its left because a 36px rail would obscure geography.
  Contextual map labels stay neutral, and their color meanings must match the
  sidebar.

## Floating and blocking surfaces

The wayfinding module applies to fixed/in-flow information. Floating map
toolbars, menus, popovers, sheets, and dialogs may continue to use the existing
frosted material tokens (`--atc-glass-*`, `--atc-control-*`, `--app-frost*`) so
the live map remains visible and interaction layers are spatially distinct.
Do not introduce a third surface recipe.

## Neutral technical material

ADSBao may borrow the material logic of exposed consumer electronics without
borrowing another product's typography, scale, color system, or signature
graphics. The intended reference is restrained hardware construction: surfaces
show how they meet, controls visibly depress, and floating layers reveal the
map beneath them. This extends Operational Wayfinding; it does not replace it.

- Fixed information content remains a flat white or black **matte information
  plate**. A very low-opacity microtexture may keep large neutral areas from
  reading as unfinished browser fill, but it must not lower text contrast or
  become visible patterning.
- Rails and compact controls may read as **machined neutral controls** through
  one inset highlight edge, one low edge, and a short glyph-only press motion.
  They keep the 36px rail, the 48px content axis, and the existing semantic
  color. Do not add screws, dot-matrix decoration, circular widget grids, or
  ornamental hardware marks.
- Existing floating frost surfaces may read as **polycarbonate interaction
  layers** through their current blur, a restrained inner edge, and controlled
  translucency. Do not increase blur merely to make the material conspicuous.
- Material is expressed by edge behavior and depth response, not by changing
  the product typeface, font sizes, yellow/deep-blue meanings, or information
  density.
- Joined rows still own exactly one structural divider. Material highlights
  are inset and cannot create a second divider between neighboring modules.

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
5. one context uses one primary color, with medium gray only for secondary/alternate
   meaning;
6. light content is white and dark content is black, except for the documented
   yellow tracked-airport identity sign;
7. every label appears once and every visible total helps an immediate task.
