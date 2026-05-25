# ADSBao — Codex Guide

Use `CLAUDE.md` as the canonical local agent guide for this repository.

- For end-to-end verification, push the work to a PR first, then use the Vercel
  preview URL generated for that PR as the verification target.
- For FlightAware-related features, merge the work and verify with Chrome,
  because the flow depends on Clerk login state.
- When developing new features or patches, do not preserve backward
  compatibility. Prefer the new pattern working correctly, even if it requires
  a breaking change, and do not prioritize tests over that goal.
