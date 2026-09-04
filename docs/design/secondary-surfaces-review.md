# Secondary surface review — 3.18.3

Reviewed on 2026-09-04 against the Soft Instrument Surfaces direction.
This is a scoped visual and interaction review, not an accessibility certification.

## Findings and corrections

| Area | Finding | Correction / evidence |
| --- | --- | --- |
| Airport loading | Old rails, one six-cell grid, wrong search/filter/heading order | Reuses live metric components and primary/secondary groups. At 1280×720, identity y14–174, summary y186–526, search y544–592 and filters y606–726 match the loaded KBOS layout. |
| Flight loading | Old metric structure and placeholder text height shifted content | Uses the flight grid and inherited label line height. Loaded UAL597 and fixture summary both y186–417.5; identity is 160px. |
| Route fallback | Missing `airport-map-kit` scope; informational pages said flight tracking | Shared route fallback now receives the current surface styles and generic page-loading/failure translations. |
| About / Backroom / Changelog identity | Icon used a separate padded grid position | Removed that grid placement and aligned the icon to its well. About measured center delta is 0px horizontally and vertically. |
| Settings | Old continuous rails, dividers, dark material override, square actions and 28px close control | Neutral rounded groups, centered header/row icons, 44px close/save/cancel controls, quieter section headings and rounded unit selectors. Removed the retired dark gradient recipe instead of stacking another important override. |
| Photo-location / ATC empty states | Tall gray rail and top-aligned icon | Compact centered icon well, readable wrapped message, no full-height gray stripe. Real local KBOS photo-location empty state inspected. |
| Photo-location navigation | Old material, truncated long names and no focus return for a controlled dialog | Shared modal and icon styles; wrapped place name; desktop centered dialog / mobile bottom sheet. Close/Escape restores the opening control and Shift+Tab wraps within the dialog. Map destination URLs retain the existing generation. |
| Loading / terminal / route error | Inconsistent floating text and card styles | Shared status card; existing loading visibility/timing logic retained; error refresh action uses the shared button. |
| Tracking lost-signal decision | Separate legacy frosted card and small actions | Shared modal material and 44px actions; callbacks unchanged. |
| Here permission notice | Legacy action materials | Shared neutral card/buttons; actual browser location-denied state inspected without changing permissions. |
| Global notifications | Older small-radius surface | Neutral material, fine rim and consistent corner treatment; error icon keeps a restrained accent. |

## Browser coverage

- Real local routes: KBOS, UAL597, About, Backroom, Changelog and Here.
- Settings: header/base-map/display, scrolled location status, units and notifications;
  desktop English light/dark and narrow 390×844 Chinese layout. No map preferences saved.
- About icon geometry, airport photo-location empty state and aircraft-type filter portal
  inspected in the rendered app. The filter already uses the shared menu surface.
- Ignored local-only harness renders the actual production components for airport/flight
  loading, generic loading, route failure, terminal signal loss, lost-signal actions, navigation, selected photo-location rows and toast states.
  These are deliberate component fixtures, not claims of live service failures.
- Navigation verified at 1280×720 light English and 390×844 dark Chinese with a long
  fixture name. No horizontal overflow; map links were inspected without launching navigation.
- Reduced-motion review verifies the existing static loading glyph and disabled modal animation.
- The specialized Plane Hunter camera/review dialog was source-audited; its camera-stage
  styling and capture/share behavior are intentionally retained. Camera hardware and image
  sharing were not exercised in this visual pass.

## Implementation review

Shared primitives replace duplicated visual recipes. No backend, feed cadence, map
allocation or routing contract changed. Temporary fixture files stay outside the build
and commit. Full typecheck, lint, test and production build checks run before merge.
