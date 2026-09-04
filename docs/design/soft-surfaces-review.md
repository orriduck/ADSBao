# Neutral instrument surfaces — local review

Date: 2026-09-04. Release candidate: 3.18.0. Local visual review completed before release.

## Direction

The six supplied references guide rounded groups, shallow rims, raised icon
wells and light numeric readouts. The correction retires yellow identity
plaques, blue provider strips and the decorative public-concourse/security
boundary. White, gray and charcoal materials now provide hierarchy in both
themes. One subdued warm-gold token appears only in small active/action cues.

Identity plates, recessed search, grouped measurements, filters, weather,
previews and settings share this treatment. About, Backroom and Changelog also
use grouped reading surfaces and compact icons instead of continuous rails.
Real aircraft photographs retain their content and the map remains unchanged.

## Current browser evidence

Reviewed in the real local browser at desktop width 1208 and mobile 390 × 844:

- KBOS: both themes, live traffic and weather, monochrome provider marks and
  neutral identity plate. Desktop sidebar measures 300.8px; document width
  matches viewport, so the map allocation and horizontal bounds are preserved.
- Home: both themes on mobile, neutral airport-code tiles, grayscale flags,
  wrapped long names, and all final Cargo hubs rows visible above the dock.
  Searching BOS returns one result and opens KBOS.
- LXJ358: live flight identity and telemetry in both desktop themes; mobile
  detail cards render. Altitude switches from ft to m through the existing
  control. Nearby selection opens the photo preview and Track opens its route.
  Chinese N747CF mobile previews were checked in both themes: neutral loading
  marker and a 5px warm-gold Track marker on the neutral action surface.
- Weather: light/dark mobile cards, long values, labels and hourly readings
  remain readable. Settings opens in both themes, uses visible neutral icons,
  and cancels without saving changes.
- About, Backroom and Changelog: rendered neutral groups. Mechanism accordion
  switches expanded entries. Changelog rendered the then-current v3.17.1 draft entry and
  loads older entries. Mobile page width is 390px without horizontal overflow.
- Keyboard: the Flight rule control receives a visible 2px outline after Tab.
  Reduced-motion emulation reports true; sampled rail animations are none.
- Visual review found and fixed weak white icons on newly neutral Near me and
  settings tiles. The old orange loading cue is now neutral; unavailable status
  uses an outlined marker in the same warm-gold accent.

## Validation and simplification

`pnpm typecheck`, focused ESLint and `git diff --check` pass. Production build
passes with the existing large-chunk advisory. Vite and its private Go service
were adopted, with local root, KBOS and health/debug checks returning 200.

Ponytail is unavailable. Manual review removed the retired boundary component,
its route usages and translation keys, obsolete yellow material rules and the
old Near me rail override. Identity material declarations were consolidated.
No new library, API path, render loop or compatibility switch was introduced.
Traffic virtualizer row heights and data handlers are unchanged. The design
and product guides now describe neutral material and a single restrained accent.

## Release preparation

The user requested a minor release and merge: this work ships as 3.18.0,
including the previously unshipped 3.17.1 design draft. Package and changelog
versions match; v3.15.2 moved into history to preserve two recent entries.
Full typecheck, lint, tests and production build passed before merge. Lint
reports existing warnings, with no errors.

The Railway staging inspection returned “Project has no services.” Current
production health identifies adsbao-backend, and the Cloudflare Builds
trigger watches main with typecheck, lint, tests and build before deployment.
Release verification therefore follows that active production path.
