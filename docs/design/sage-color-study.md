# Sage materials — reference study

Reviewed 2026-09-06. Request: make the theme color more expressive without
turning ordinary buttons into generic brand-colored controls.

## References and observations

| Official source | Observed design | Application to ADSBao |
| --- | --- | --- |
| [Oura: How it works](https://ouraring.com/how-it-works) | The morning UI example combines a dark rounded readiness instrument with a small gold icon and blue sleep-stage bars. The readings remain prominent against quiet card material. | Put color in existing data graphics: the temperature scale. Keep flight-rule severity neutral so brand color cannot imply safe weather. |
| [Nothing OS](https://us.nothing.tech/nothing-os/) | The official OS 5.0 preview pairs tinted clock/battery widgets and a solid green circular utility with neutral interface elements. Its settings illustration still uses white Apply and neutral outlined choices. This is preview imagery, not a claim that all devices have shipped this UI. | Use solid sage only in small identity medallions; repeat a lighter tint in airport code tiles and selected readings. Keep action buttons neutral. Do not copy its translucent wallpaper, typeface or large widget layout. |
| [Apple: Behind the Design, Flighty](https://developer.apple.com/news/?id=970ncww4) | The 2023 design interview prioritizes immediately available flight information and describes simple circular progress displays. | Keep identifiers and real progress legible. Preserve the allocated map area and existing data density. Airport-sign styling is excluded by ADSBao's product direction. |

Oura and Nothing reference images were inspected in the browser. Flighty's
interview was read as an information-hierarchy reference. The adaptation below
is our design judgment, not a claim about these products' internal tokens.

## User-supplied palette

The user's interior photograph supplied during implementation supersedes the
initial cooler jade direction. Median RGB samples from broad interior regions
(not edge shadows) are sage `#a0ab98`, gray olive `#8c8a79`, warm ivory `#d5c9b9`,
and the narrow wood edge `#472d1b`. These are sampled photographic colors under
ambient light, not paint specifications.

For a readable interface, lift the ivory into `#faf7f0` paper and `#ede8de`
identity material. Use sage as an actual small inlay, with dark green ink for
contrast. Gray olive informs the column and warm labels. The wood tone informs
the warm neutrals rather than becoming an extra action color. Dark mode uses
olive charcoal with pale sage readings. The map's colors stay unchanged.

## Color hierarchy

1. **Identity:** green airport/flight identifiers with one solid sage medallion
   on the neutral identity plate. Home and information pages share the medallion; aircraft previews repeat
   it in their identity icon.
2. **Selection:** a pale sage inset, green reading and solid icon for the
   selected view. Keep the underline, rim and pressed state. Pointer hover must
   not erase selection. Active filter icon wells repeat the tint at a smaller scale.
3. **Discovery:** airport directory codes use green ink in lightly tinted
   wells. Names and row structure stay stable; warm metadata ink keeps small copy readable.
4. **Data:** temperature-scale fill uses green; missing readings, flight-rule severity
   and asynchronous states retain neutral handling.
5. **Actions:** Track keeps its small marker; buttons, provider logos, settings,
   map ink and photographs retain their existing treatment.

The palette has one hue and three roles: readable ink (`--soft-accent`), a
solid small inlay with a contrasting glyph, and an 11% mixed wash. Both themes use a sage inlay with dark green glyphs; the reading ink
is darker in light mode and lighter in dark mode. No colored shadow, new animation, decorative chart,
extra panel or map overlay is introduced.

## Validation

Use `CLAUDE.md`'s UI-only browser path. Inspect Home, KBOS, weather, filters,
tracked aircraft, preview and Here; include light/dark and a narrow viewport.
Check selected/hover/focus states, search, unit toggles, settings, missing data,
horizontal overflow, contrast and reduced motion. Run the current build and
review CSS specificity and unused rules before closing the work.

### Results, 2026-09-06

- Adopted the healthy Vite/Go processes with `pnpm debug:local`; no service restart.
- Browser-reviewed Home, KBOS, weather, active filters, aircraft preview,
  DAL2373 tracking and Here. Checked both themes across the shared surfaces,
  including the 390 × 844 detail view and desktop map workspace.
- Search: Boston → ArrowDown → Enter opened KBOS; focus remained visible.
- Tracking: selected a real aircraft, opened Track, and independently switched
  speed and altitude units. Missing route responses remained explicitly neutral.
- Settings: opened the Units group, selected °F, verified the unsaved draft,
  and cancelled. Ordinary controls and Save remain neutral.
- Here used the existing injected-GPS debug view. Under reduced motion, the
  browser reported zero animated digit elements. This is layout validation,
  not a claim of real device GPS or compass validation.
- At 390px, document width remained 390px; the settings sheet settled within
  the viewport. Desktop retained the 300px column and existing map allocation.
- New identity ink contrast: 5.22:1 light / 8.36:1 dark; inlay glyph contrast:
  4.84:1 light / 5.81:1 dark. Small labels use opaque warm ink.
- Manual simplification review removed the older forced filter-color rule and
  kept the palette in the existing stylesheet. No new dependencies or animation.
- Production build passed; Vite retains its existing large-chunk warning.
  Version and rolling changelog are aligned at 3.21.1. No deployment was performed.
