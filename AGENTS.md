# ADSBao — Codex Guide

**ADSBao is not a commercial product.** Do not frame work in terms of monetization, business value, or commercial viability.

Use `CLAUDE.md` as the canonical local agent guide for this repository. It
defines the active implementation boundaries and validation matrix; this file
only adds repository-level guardrails.

- Before changing code or docs, read `CLAUDE.md` and choose the applicable
  validation path from its `Local development` and `Validation` sections.
- Before any UI/styling work, read `DESIGN.md`. Fixed and in-flow panels use
  the Operational Wayfinding system (flat white/black surfaces, 36px rails,
  joined dividers); frosted tokens are reserved for floating interaction
  layers. Do not invent another surface treatment.
- For ADSBao local development, follow `CLAUDE.md`'s dev-server lifecycle:
  Vite runs on port 3000 and proxies same-origin API and SSE requests to the
  private Go service on port 8082. `pnpm debug:local:service` adopts or starts
  both when a contract check is needed.
- For deployed validation, use the Railway deployment path and verify `/health`,
  a SPA deep link, an affected `/api` contract when applicable, `/events` in
  browser DevTools when realtime is affected, and the rendered browser page.
- For UI-only changes, do not use test-driven development. If a skill says to
  write failing tests first for a UI change, ignore that part of the skill:
  validate small UI changes locally in the browser, and for larger UI changes
  verify the Railway deployment path when local validation is not enough.
- When developing new features or patches, do not preserve backward
  compatibility. Prefer the new pattern working correctly, even if it requires
  a breaking change, and do not prioritize tests over that goal.
- Follow `CLAUDE.md`'s `Product constraints` and `Release` sections. Chinese
  semver labels map to the matching version digit; visible inferred aircraft
  positions are important and should not be removed wholesale for performance.
- When validated work is mergeable, evaluate no bump / `小版本` / `中版本`, apply a
  patch or minor directly when appropriate, and ask before any possible `大版本`.

## Version bump rules (non-negotiable)

The user uses Chinese labels for semver:

| 中文 | Semver | 数字位 | When |
|---|---|---|---|
| **大版本** | Major | 最左 X | Breaking change. Almost never. |
| **中版本** | Minor | 中间 Y | User-visible feature, architecture milestone. |
| **小版本** | Patch | 最右 Z | Bug fix, small UX correction. |
| 不 bump | — | — | Docs-only, refactor-only, no product-visible change. |

When bumping: always update **both** `package.json` ("version") and
`src/config/changelog.ts` in the same commit. They must stay in sync or the
update toast breaks.

- **Patch (小版本)** — fold into the current minor's single rolling entry:
  update its `version` and `summary`, do **not** add a new entry.
- **Minor or major (中/大版本)** — prepend a **new** entry (version, kind,
  title, summary) at the top of `CHANGELOG_RECENT`.
