# ADSBao — Codex Guide

Use `CLAUDE.md` as the canonical local agent guide for this repository. Keep
the full validation decision tree there; do not duplicate it in this file.

- Before changing code or docs, read `CLAUDE.md` and choose the validation mode
  from its `Validation modes` section.
- For Vercel preview validation, push the work to a PR first, then use the
  preview URL generated for that PR as the verification target.
- For FlightAware-related features, merge the work and verify with Chrome,
  because the flow depends on Clerk login state.
- For UI-only changes, do not use test-driven development. If a skill says to
  write failing tests first for a UI change, ignore that part of the skill:
  validate small UI changes locally in the browser, and for larger UI changes
  push a PR first and verify against the Vercel preview URL.
- When developing new features or patches, do not preserve backward
  compatibility. Prefer the new pattern working correctly, even if it requires
  a breaking change, and do not prioritize tests over that goal.
