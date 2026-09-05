# Design — Soft Instrument Surfaces

The September 2026 reference direction pairs rounded, softly lit panels with
quiet labels and large, light numerals. The supplied music-library and health
instrument references guide rounded form, shallow relief and quiet typography. The interface now
uses neutral materials and a single restrained jade-green accent. Airport
terminal signs and security-zone decoration are retired.

## Invariants

- Preserve light/dark theme selection and map styling. Use white, gray and
  charcoal surfaces; softly lit identity plates sit above the neutral sidebar
  backdrop. Layer separation comes from luminance, fine rims and shallow shadows.
- Keep the established Figtree family. Numeric readings use tabular figures.
- Keep the map first: desktop sidebars retain their allocated width; rounded
  groups sit within that column and do not cover additional geography.
- Preserve routes, data contracts, real-time updates and click paths.
- ADSBao is not a commercial product; do not introduce marketing sections.

## Surface construction

`src/soft-surfaces.css` owns the current interface geometry and material and is
loaded after the foundational styles. Reuse its tokens rather than inventing
another card treatment.

- Major identities and instrument groups use a 24px outer radius, 12px column
  insets and 12–18px gaps. Inner controls use 14–18px radii; icon tiles use
  10–13px radii. Tiny status icons may sit in circular wells.
- Use a fine upper rim and a broad, low-opacity shadow to suggest shallow
  elevation. Dark surfaces use a restrained neutral sheen. Never add colored
  glows, large accent-colored backgrounds, or full-screen blur.
- Group related readings within one surface. Do not put every label in a card.
- Replace continuous vertical rails with small icon or identifier tiles. The
  36px rail primitive remains available for dense secondary content, but the
  main identity and metric layout no longer requires a 48px reading axis.
- Search fields read as recessed rounded controls. Settings form compact
  groups with quiet separators. Every interactive element retains visible
  keyboard focus and its existing selected/expanded state.

## Identity and color

Use one chromatic UI token: `--soft-accent`, a cool jade green with separate
light/dark luminance (`#267967` on light surfaces, `#66b59e` on dark surfaces). Keep it to small active-view underlines, the Track action
marker and focus, and a fine focal-airport edge.
Never use it as a panel fill, title plaque, provider strip or colored glow.

- Identities use neutral plates, subtle directional light and raised icon wells.
- Provider links use quiet monochrome marks with contrast in both themes.
- Selected aircraft, live trace and ordinary controls retain neutral map ink.
- Active controls also change relief or outline so color is not the only cue.
- Loading and successful asynchronous states use neutral dots; unavailable
  states use a high-contrast neutral outline with the existing status label, so
  brand green never reads as a successful result for unavailable data.
- Photographs retain their real content. Do not recolor the map or photography
  to manufacture an accent theme.

Airport codes and callsigns lead; location and full names follow. Do not
truncate away the main identifier just to fit an icon. Page endings use ordinary
spacing with clearance for the mobile dock, without decorative boundary text.

## Typography and lists

- Large readouts use light weight, tight tracking and tabular numerals. Units
  are smaller and sit on the same baseline; clock and long weather readings
  use a slightly smaller size to fit narrow desktop columns.
- Labels are quieter, but remain readable. Icons sit beside labels rather
  than occupying full-height colored bands.
- The airport directory uses visible topic headings, rounded code tiles and
  fine separators within each group. Long names wrap without colliding with
  trailing navigation indicators.
- Nearby traffic remains dense and virtualized. Keep its exact row height
  unless the virtualizer measurement contract is updated with it.
- Preview cards and floating toolbars share the soft rim and curvature. The
  live map, aircraft and trace styling remain untouched.

## Motion and accessibility

- Retain short, state-driven icon motion. Do not animate whole reading surfaces
  on every data refresh or add a delay before information can be read.
- Respect reduced motion and reduced transparency. No new continuous effects.
- Selection is indicated by structure as well as color. Keep labels, units,
  keyboard access and focus rings present.
- Loading surfaces mirror the rounded identity and metric-group geometry.

## Visual review

Review Home, an airport, a tracked flight, weather, filters and a map preview:

1. Check both themes in a real browser, including a narrow mobile viewport.
2. Verify column/map bounds, no horizontal overflow and readable long values.
3. Exercise search, view switching, unit toggles, selection and settings.
4. Check focus visibility and reduced-motion behavior.
5. Confirm neutral identity/provider surfaces and restrained use of one accent.
6. Run a current production build and inspect the changed CSS for duplicated
   rules, unsupported selectors and unnecessary visual machinery.
