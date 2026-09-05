# Apple interaction review — ADSBao 3.20

Reviewed 2026-09-05 against local 3.19.2 (`474d92fc`). This is a product-specific application of Apple's interaction principles, not a native iOS implementation or a Liquid Glass restyle. PRODUCT.md and DESIGN.md remain canonical.

## Sources and application

| Official source | Principle | ADSBao application |
| --- | --- | --- |
| [Search fields](https://developer.apple.com/design/human-interface-guidelines/search-fields) | Explain search scope, clear input, refine results as people type | Named search fields, clear action, keyboard result navigation, useful empty/error recovery |
| [Segmented controls](https://developer.apple.com/design/human-interface-guidelines/segmented-controls) | Group related choices and make the selection apparent | Three settings categories; native radio behavior for mutually exclusive units and ranges |
| [Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets) | Keep a scoped task attached to its context with predictable dismissal | Stable settings header/footer; Save commits map, unit and alert drafts; Cancel/Esc/X discard those drafts |
| [Layout](https://developer.apple.com/design/human-interface-guidelines/layout) | Group related content; prioritize essential information | Preserve the map and existing sidebar width; expose one settings category at a time |
| [UI Design Dos and Don'ts](https://developer.apple.com/design/tips/) | Adequate touch targets and legible controls | 44 CSS-pixel targets for new search, settings and recovery actions (web adaptation of Apple's point guidance) |
| [Writing](https://developer.apple.com/design/human-interface-guidelines/writing) | Clear labels and actionable, nearby error feedback | Device-local save copy, explicit filter choices, retry and clear actions |

## Baseline findings

The neutral palette, real map, restrained warm accent and rounded instrument groups fit the product. No generic dashboard or decorative glass restyle is needed. Primary identifiers and weather are strong; interaction consistency is the main opportunity.

| Priority | Finding | Resolution in this pass |
| --- | --- | --- |
| P1 | Settings Cancel discards map edits but unit/alert controls already changed preferences | Stage map, units and alerts together; explain that separate browser/session actions are immediate |
| P1 | Search has a placeholder but no accessible name or dedicated clear action; async results can arrive after the query changes | Named search, explicit clear, guarded request lifecycle, keyboard result traversal; city matches take precedence over alphabetic callsign guesses |
| P2 | Targets/status show dropdown chevrons but clicking silently cycles choices | Native select overlays preserve tile styling and expose choices directly |
| P2 | Active traffic filters can leave an empty list with no direct recovery | Clear filters action and contextual empty-state guidance; preserve virtualizer row measurements |
| P2 | Multi-select menus could clip at the viewport and lacked keyboard focus management | Shared menu behavior with bounds checking, arrow/Home/End navigation, checkbox state and Escape focus return |
| P2 | Base-map selection only has a visual stripe; custom unit radios lack arrow-key handling | Native radio groups with structural selected states and visible focus |
| P2 | All settings appear in a long list; alert radius numbers change their unit suffix without conversion | Map/Units/Alerts category control; convert displayed radii while keeping the stored NM contract |
| P2 | State selectors overrode reduced-motion rules for settings sheets | Match state-selector specificity; confirm computed animation is disabled |
| P2 | Success message incorrectly promises account storage | Describe device-local preferences accurately |

Baseline heuristic assessment (expert review, not a user study): status 3, real-world match 3, control/freedom 2, consistency 2, error prevention 2, recognition 3, efficiency 2, minimalism 3, recovery 2, help 2 = **24/40**. Cognitive-load checklist: grouping and hierarchy pass; long settings list fails progressive disclosure and minimal choices (2/8 failures).

Persona checks: frequent aviation users need direct filter selection and fast keyboard search; keyboard users need named inputs, real radio navigation and focus return; mobile spotters need large clear/dismiss controls and a fixed settings footer. Existing metric buttons use `aria-pressed` correctly; the macOS accessibility tree's checkbox mapping alone is not evidence of a semantic defect.

## Review scope

Home search, airport traffic/weather, tracked-flight sidebar and preview, settings, light/dark themes, narrow layout, keyboard focus and reduced motion. Preserve routes, live data contracts, inferred aircraft, map layers, imagery and list row height. Keep browser permission requests explicit and separate from preference editing. No new dependencies or ongoing animation.

## Validation

Verified locally on 2026-09-05:

- `pnpm debug:local:service`: adopted frontend at `:3000`, started the unavailable private service at `:8082`; root, KBOS deep link, proxied/direct health returned 200.
- `pnpm typecheck`, current `pnpm build`, `git diff --check` passed. Full lint has no errors; the final changed TypeScript files have no lint warnings. The build retains its existing large-chunk advisory.
- `pnpm test`: 114 test files passed, including new regression cases for alphabetic city matches, numbered callsigns and alphabetic registrations, and the version/history consistency test.
- Home: Boston + ArrowDown focuses BOS; Escape returns to the input; Enter opens KBOS. Explicit clear restores discovery. An unmatched query shows 0 results and an actionable Browse airports control.
- Controlled browser fault injection: blocked only local `/api/search`, verified friendly failure and Retry, unblocked it and received real Seattle results. A 5-second request delay verified that clearing an in-flight Montreal search leaves discovery visible with zero search-result rows after completion. Network emulation was restored.
- Settings: native arrow keys change the selected unit; map/unit/alert drafts persist across categories; Cancel discards all three; reopening restores original Standard map / NM / airport-alert state. Saving °F updated the live weather reading to 68 °F; restored °C afterward. Cancel returns focus to Map settings. Base-map and alert choices expose native checked state.
- Filters: native Targets/Status select controls expose direct choices; a deliberately unmatched aircraft query gives recovery guidance; Clear filters resets search and all four filter dimensions. Multi-select menus expose checkbox state, stay within the screen and support End/Escape with focus return.
- Real routes: KBOS traffic/weather, DAL987 preview and the preview → tracking route. Mobile tracking detail retained the callsign and search without horizontal overflow. Route lookup was temporarily unavailable in the preview; its existing retry state remained usable.
- Visual checks: 1280×720 desktop light, 390×844 narrow desktop dark, and iPhone UA/touch emulation at 390×844 in English and Chinese. Phone settings use a full-width bottom sheet at y84, height 760; new segmented targets measure 44px. Map allocation and virtualized row height are unchanged.
- Reduced motion/transparency: computed settings animation is `none`; backdrop filter is `none`. No new continuous animation. Browser emulation is restored after testing. This is browser device emulation, not a physical iPhone or a VoiceOver certification.
- Manual simplification review: no Ponytail tool available; consolidated the two duplicated filter-menu lifecycles, reused native radio/select behavior, removed obsolete map-control prop forwarding and transient search-status machinery. No dependencies added.

## Remaining observations outside this frontend pass

The live local `/api/search?q=Seattle&limit=12` response includes empty `name` and `city` fields for KPAE/KSEA. Existing code fallbacks keep those results navigable, but directory name enrichment belongs to the private service. This pass does not fabricate missing airport names or change that API contract.

This record verifies local implementation and the 3.20.0 version bump; it does not claim a production deployment.

## Continued mobile review — 2026-09-05

Additional browser checks at 375×667, 320×568 and 667×375 (iPhone UA/touch emulation):

- Phone landscape settings previously left 127.625px for scrolling content. Reduced short-viewport header/note/footer spacing now leaves 169.125px while keeping the category and action buttons at 44px. The map-label slider hit area increased from 22px to 44px; changing its value updates the draft and Cancel discards it.
- 320px English notification categories, radius choices, weather and time detail all fit. Weather pressure now includes hPa, using the existing small-unit metric treatment. Verified in light and dark themes.
- Weather and time detail scroll to their final content above the mobile dock. A temporary Pacific/Kiritimati browser timezone confirmed an 18-hour difference with different dates and complete timezone labels. Timezone override was restored.
- User-reported Here center issue reproduced through the existing `/here?debug=here` UI with public test coordinates: dragging moved the GPS marker from (160,284) to (423,382), outside the 320px viewport. Here now uses its own locked interaction mode; airport exploration retains bounded dragging.
- A second Here defect reproduced after a stationary interval: changing the debug GPS longitude left the marker at x204 instead of x160. The aircraft animation frame loop removes idle subscriptions, while Here supplied a constant motion key. Removed this unnecessary interpolation path so Here receives each GPS fix directly. Verified an explicit coordinate jump, continuous Drive simulation, Stop and dragging all leave the marker at (160,284). This verifies the app's coordinate-to-camera path, not physical-device GPS accuracy.
- Removed the shared loading indicator's card surface per user feedback. Real AAL109 detail loading shows the dot matrix and status text directly on the page. Computed background is transparent, border is 0px, shadow is none, and no status-card ancestor remains. Normal live detail recovered after restoring network conditions.
- RPA4524 real mobile preview at 320px: the route retry status now wraps completely instead of truncating, and vertical speed includes fpm. Both themes verified.
- Current full test run: 114 files passed, including Here interaction-mode regression coverage. Current build and typecheck passed. Removed the unused Here motion-anchor helper and its obsolete tests; aircraft motion rendering remains unchanged.

Mobile review is ongoing at the user's request. These refinements remain part of the unshipped local 3.20.0 worktree.

### ATC, spotting and short-viewport follow-up

- Reproduced Chinese ATC UI with hardcoded English labels and literal `<nil>` descriptions. Localized panel/role/action/empty copy, added MHz to the heading, suppressed the empty-value sentinel, and allowed long station descriptions to wrap. Verified real KBOS frequencies at 390px and 320px in both themes; no horizontal overflow or `<nil>` remains in the displayed table.
- KBOS spotting empty state is readable and scrollable above the dock. Read-only local service checks returned zero spotterLocations for KBOS and EGLL; populated spot navigation was therefore not claimed as browser-verified.
- Coordinate review found Number(null)/Number("") could turn missing spot coordinates into 0,0. Shared coordinate validation now excludes blank, nonnumeric and out-of-range positions from both the spot list and navigation links. Six focused navigation tests pass, including valid zero coordinates and numeric strings; no synthetic spot was presented as real data.
- At 390×360 with the search input focused, the home identity occupied 148px and pushed the first result toward the dock. A coarse-pointer short-height rule reduces only its vertical spacing. The search starts at y109 and the first result ends at y291, above the dock; clicking the BOS result opens KBOS. This is a short viewport simulation, not a physical iOS keyboard test.
- Current typecheck, changed-file lint, i18n model check and production build passed. These are further local 3.20.0 refinements; no deployment or version increment per check cycle.

### Flight reading controls

- On the live SWA1377 page, selecting km/h and then metres reset speed to knots. Replaced the mutually exclusive metric selection with independent choices for speed, altitude, vertical speed and track direction.
- Closing the mobile detail cards and reopening them also reset every choice. Keep these display choices in the current flight page so card mounting and portrait/landscape transitions preserve them; opening another tracked flight starts with its own default readings.
- Browser verification at 390×844, 844×390 and 320×568: speed and altitude remained selected after Map → Open detail cards and both orientation changes. Toggling speed back to knots left altitude in metres. All four alternate displays can be selected together, and the narrow detail cards have no horizontal overflow. The landscape map toolbar rendered normally after its transition.
- This is browser iPhone UA/touch emulation using live local flight data, not a physical-device test. Unit conversion formulas are unchanged.
- Typecheck, changed-file lint, the existing telemetry state and changelog consistency tests, production build and diff whitespace check passed after this change. The existing large-chunk build advisory remains.

### Numeric tiles — Transitions.dev

User requested the [Transitions.dev Number pop-in](https://github.com/Jakubantalik/transitions-dev/blob/main/skills/transitions-dev/02-number-pop-in.md) across numeric detail tiles (source checked 2026-09-05).

- Extended the existing `AnimatedNumber` to accept already-formatted readings without reparsing or rounding them. Shared `WayfindingMetric` now animates numeric values by default, including clocks, weather strings, Here heading and count tiles. Added coverage to weather hero/hourly/detail readings, time comparison clocks/dates/difference, ATC frequencies, and airport/aircraft/navaid/airspace/spot preview readings.
- Digits enter on mount and replay when their own value changes. Text, units, punctuation and placeholders stay static. Keep the existing local 220ms/4px recipe, current-value DOM text, reduced-motion guard and hidden-tab suppression; no new runtime, ticker or interpolated readings.
- Browser checks: real KBOS weather/METAR values at 390px; captured computed `t-digit-pop-in`, `0.22s` and nonzero translation while active. Compound readings `22° / 16°`, `10+ SM` and `BKN040` preserve their visible formatting; literal spans have no animation. At 320px in dark mode, time/detail cards have no horizontal overflow.
- Temporary Pacific/Kiritimati browser timezone verified `06:59`, the next day's date and `Airport is 18h behind`; restored afterward. Frequency `121.650` preserves trailing zero. With reduced motion enabled, every inspected digit reports animation `none` and no active digit class remains. Accessible names expose each complete reading once.
- Pure slot regression cases cover exact text reconstruction, Unicode digits, spaces, leading/trailing zeros, composite readings and carry/sign changes. Browser checks use device emulation, not a physical phone. Preview variants without current live data are covered by the shared implementation/typecheck rather than claimed as individually browser-verified.
- Live SWA1377 unit toggles triggered the actual pop-in animation while speed and altitude retained independent selections; subsequent live readings continued updating. Typecheck, changed-file lint, all 115 test files, production build and diff check passed. Build retains its existing chunk-size advisory. Manual simplification reused one animation component and the shared metric/preview surfaces, without a new dependency or DOM-wide digit scanner.
