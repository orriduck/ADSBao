# Auto i18n Library Research

Research date: 2026-05-31

## Context

ADSBao is currently a Next.js App Router application with a small custom
client-side i18n layer:

- `src/config/i18n/en.js` and `src/config/i18n/zh-CN.js` hold nested JS
  dictionaries.
- `src/features/app-shell/i18n/i18nProvider.jsx` renders English on the server,
  then reads `localStorage` on the client and switches the UI after hydration.
- `useI18n()` is imported from 48 source files.
- The English dictionary currently has 349 leaf strings.
- There are about 342 literal `t("...")` / `t('...')` call sites.
- Routes are not locale-prefixed today: `/`, `/about`, `/changelog`,
  `/airport/[icao]`, and `/aircraft/[callsign]`.

That means a real library migration is mostly about routing and server/client
locale ownership, not just replacing a formatter function.

## Evaluation Criteria

- Works with Next.js 16 App Router and React 19.
- Handles both Server Components and Client Components.
- Has a clean locale switching story.
- Can migrate the existing nested key dictionaries without rewriting every UI
  component in one pass.
- Avoids surprising runtime translation of aviation identifiers, callsigns,
  airport codes, route strings, and telemetry values that should stay
  `translate="no"` / `.notranslate`.
- Keeps generated or vendor-managed translation artifacts out of the critical
  app path unless the tradeoff is explicit.

## Candidates

### next-intl

Current package check: `next-intl@4.13.0`, MIT, peer range includes Next 16 and
React 19.

Official setup uses `src/proxy.js`, `src/i18n/routing`, `src/i18n/request`, and
a top-level `src/app/[locale]` segment. It supports nested message objects and
ICU formatting, so the existing dictionaries map cleanly to JSON messages. It is
not an AI translation library by itself; it is the strongest conventional Next
App Router i18n foundation.

Fit for ADSBao: best default choice if the goal is a maintainable Next-native
i18n system. We can preserve most call sites by implementing a temporary
`useI18n()` compatibility adapter around `next-intl` and then migrate components
incrementally.

Main cost: route restructuring. We should choose locale-prefixed URLs such as
`/en/airport/KBOS` and `/zh-CN/airport/KBOS` instead of keeping the current
localStorage-only switch. This fixes the current SSR/client locale mismatch and
makes page metadata localizable.

### gt-next / General Translation

Current package check: `gt-next@6.16.30`, `gt@2.14.45`, FSL-1.1-ALv2 license.

General Translation is the closest match if "auto i18n" means AI-assisted or
on-demand translation. Its docs describe a `<T>` wrapper for JSX content,
`useGT()` / `getGT()` for strings, generated translation files, optional API
keys for development on-demand translation, and a production build step such as
`gt translate && next build`.

Fit for ADSBao: useful for an experiment on content-heavy pages or for
generating translations, but not the default core runtime choice. ADSBao already
has extracted keys, many strings are attributes or config values, and many
aviation values must never be translated. The license is also not MIT/Apache/BSD,
so it needs an explicit acceptance before becoming a dependency.

Main cost: to get the advertised automatic workflow, existing `t("key")` usage
would need to be replaced by source-language strings, `<T>`, `useGT()`, `msg()`,
or GT dictionaries. The migration is broader than `next-intl`, not narrower.

### Lingui

Current package check: `@lingui/core@6.1.0` and `@lingui/react@6.1.0`, MIT.

Lingui supports React Server Components and has strong extraction tooling. Its
recommended path uses macros like `t` and `<Trans>`, an SWC plugin in
`next.config`, locale routing with `app/[lang]`, and request-scoped i18n setup.
Its extractor can keep catalogs synchronized, but it only extracts supported
static patterns.

Fit for ADSBao: good if we want source-code extraction and translator-friendly
catalog tooling. It is less aligned with the current key-first dictionary model,
and the macro/SWC setup adds build-system risk on top of the existing Sentry
Next config wrapper.

Main cost: many call sites would need to move from key lookup to Lingui macros
or descriptors. Lingui also documents that locale setup may need to happen in
pages as well as layouts in App Router.

### next-i18next / i18next

Current package check: `next-i18next@16.0.7`, MIT, App Router support now exists.

This is attractive when an app already depends on the i18next ecosystem,
backends, or Locize workflows. For ADSBao, it is heavier than needed and does
not provide a better migration shape than `next-intl`.

Fit for ADSBao: fallback candidate only if we specifically want i18next
ecosystem compatibility.

### Tolgee

Current package check: `@tolgee/react@7.1.0` and `@tolgee/web@7.1.0`, MIT /
BSD-3-Clause.

Tolgee is more a localization platform plus SDK than a tiny app library. The
App Router guide uses static data, server/client setup, env vars, and language
cookies, with a separate recommendation to use next-intl for route-based
localization.

Fit for ADSBao: useful if in-context editing and a translation management UI are
the main goal. Less useful for the immediate codebase migration because it adds
platform concepts and CSP/env surface area.

### Paraglide JS / paraglide-next

Current package check: `@inlang/paraglide-js@2.18.1`,
`@inlang/paraglide-next@0.8.1`, MIT.

Paraglide compiles messages into tree-shakeable functions and fits the inlang
tooling ecosystem. The public Next.js docs are currently much thinner than
next-intl or Lingui for App Router.

Fit for ADSBao: promising for a greenfield or compile-time-first i18n system,
but too much integration uncertainty for the first migration PR.

### next-international

Current package check: `next-international@1.3.1`, MIT.

This is a small type-safe i18n library for Next.js. ADSBao is a JavaScript repo,
so the type-safety advantage is mostly lost unless we also migrate i18n files or
the app to TypeScript.

Fit for ADSBao: not recommended unless the repo moves toward TypeScript.

### Intlayer / next-intlayer

Current package check: `next-intlayer@8.11.1`, Apache-2.0.

Intlayer supports Next App Router, middleware, server/client providers,
component-local content declarations, CLI workflows, visual editor concepts, and
auto-fill tooling.

Fit for ADSBao: worth revisiting if the desired outcome is component-local
content declarations plus AI fill workflows. It is not the smallest migration
from the current global nested dictionaries.

## Recommendation

Use `next-intl` as the base i18n library, and treat AI translation as a separate
content workflow rather than the runtime foundation.

Recommended first implementation PR:

1. Add `next-intl`.
2. Move page routes under `src/app/[locale]`, keeping API routes outside the
   locale segment.
3. Add `src/proxy.js` and `src/i18n/{routing,request,navigation}.js`.
4. Convert `src/config/i18n/en.js` and `zh-CN.js` into JSON messages, or keep a
   temporary JS-to-message import while the migration is in progress.
5. Replace the current `I18nProvider` with `NextIntlClientProvider`.
6. Keep a compatibility `useI18n()` wrapper that exposes `{ locale, setLocale,
   cycle, t }` so most UI components do not need to change in the first pass.
7. Implement `setLocale()` / `cycle()` with locale-aware navigation instead of
   `localStorage`.
8. Update localized metadata for `about`, `changelog`, airport pages, and
   aircraft pages once the routing foundation is stable.
9. Add an i18n key parity check so English and Chinese catalogs cannot drift.

Do not start with `gt-next` as the production dependency unless the license and
vendor workflow are explicitly accepted. A safer future path is to run a small
separate spike that uses GT or Intlayer only to generate or fill translations,
then imports reviewed output into `next-intl` messages.

## Sources

- Next.js App Router internationalization guide:
  https://nextjs.org/docs/app/guides/internationalization
- next-intl routing setup:
  https://next-intl.dev/docs/routing/setup
- next-intl translation usage:
  https://next-intl.dev/docs/usage/translations
- General Translation Next.js overview:
  https://generaltranslation.com/en-US/docs/next/introduction
- General Translation Next.js quickstart:
  https://generaltranslation.com/en-US/docs/next
- Lingui React Server Components guide:
  https://lingui.dev/tutorials/react-rsc
- Lingui message extraction guide:
  https://lingui.dev/guides/message-extraction
- Tolgee Next.js App Router guide:
  https://docs.tolgee.io/js-sdk/integrations/react/next/app-router
- Paraglide JS Next.js guide:
  https://inlang.com/m/gerre34r/library-inlang-paraglideJs/next-js
- Intlayer next-intlayer package docs:
  https://intlayer.org/doc/packages/next-intlayer/exports
- next-i18next README:
  https://github.com/i18next/next-i18next/blob/master/README.md
- next-international repository:
  https://github.com/QuiiBz/next-international
