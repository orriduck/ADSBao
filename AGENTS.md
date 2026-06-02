# ADSBao — Codex Guide

Use `CLAUDE.md` as the canonical local agent guide for this repository. Keep
the full validation decision tree there; do not duplicate it in this file.

- Before changing code or docs, read `CLAUDE.md` and choose the validation mode
  from its `Validation modes` section.
- For Vercel preview validation, push the work to a PR first, then use the
  preview URL generated for that PR as the verification target.
- For FlightAware-related features, merge the work and verify with Chrome,
  because the flow depends on Clerk login state.
- When developing new features or patches, do not preserve backward
  compatibility. Prefer the new pattern working correctly, even if it requires
  a breaking change, and do not prioritize tests over that goal.
