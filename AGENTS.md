# ADSBao — Codex Guide

**ADSBao is not a commercial product.** Do not frame work in terms of monetization, business value, or commercial viability.

Use `CLAUDE.md` as the canonical local agent guide for this repository. Keep
the full validation decision tree there; do not duplicate it in this file.

- Before changing code or docs, read `CLAUDE.md` and choose the validation mode
  from its `Validation modes` section.
- Before any UI/styling work, read `DESIGN.md` — the liquid-glass material
  system (two materials, token-driven) is the source of truth; extend it
  instead of introducing flat fills, hard borders, or new surface treatments.
- For ADSBao local development, follow `CLAUDE.md`'s dev-server lifecycle:
  subagents should start and maintain both the Go data-service on port 8081
  and the Vite frontend on port 3000. See `CLAUDE.md` for env vars and the
  full two-service startup procedure.
- For deployed validation, use the Railway single-service deployment and verify
  `/health`, `/api/feature-flags`, static SPA fallback, `/ws`, and the rendered
  browser page.
- For FlightAware-related features, merge the work and verify with Chrome,
  because the flow depends on Clerk login state.
- For UI-only changes, do not use test-driven development. If a skill says to
  write failing tests first for a UI change, ignore that part of the skill:
  validate small UI changes locally in the browser, and for larger UI changes
  verify the Railway deployment path when local validation is not enough.
- When developing new features or patches, do not preserve backward
  compatibility. Prefer the new pattern working correctly, even if it requires
  a breaking change, and do not prioritize tests over that goal.

## Version bump rules (non-negotiable)

The user uses Chinese labels for semver:

| 中文 | Semver | 数字位 | When |
|---|---|---|---|
| **大版本** | Major | 最左 X | Breaking change. Almost never. |
| **中版本** | Minor | 中间 Y | User-visible feature, architecture milestone. |
| **小版本** | Patch | 最右 Z | Bug fix, small UX correction. |
| 不 bump | — | — | Docs-only, refactor-only, no product-visible change. |

When bumping: always update **both** `package.json` ("version") and
`src/config/changelog.ts` (prepend entry with `version: "vX.Y.Z"`) in the
same commit. They must stay in sync or the update toast breaks.
