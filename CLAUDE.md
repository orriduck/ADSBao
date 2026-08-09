# ADSBao — Agent Guide

ADSBao is the public frontend repository. The private `adsbao-service`
repository owns every server endpoint, database concern, upstream integration,
and secret. Do not reintroduce service code, migrations, credentials, or
provider-specific compatibility branches here.

## Local development

Adopt existing servers instead of restarting them. The frontend runs on port
3000 and proxies the same-origin API/SSE paths to the private service on
port 8082.

```bash
pnpm debug:local:status
```

If either service is absent, start the private service from its repository with
`PORT=8082 ./run-local.sh`, then run `pnpm dev` here. Keep both running after
local validation when the user asks to inspect the app.

## Product constraints

- Route lookup is one private-service contract; no browser-side provider
  selection, fallback, or authentication path exists.
- Position rendering keeps inferred positions visible when they are useful to
  the map, while the private service owns source selection and fallback.
- Aircraft-position responses may expose the final successful provider's
  curated public name as provenance. Keep provider selection, fallback order,
  credentials, request attempts, cooldowns, and errors private.
- Do not keep compatibility layers or tests for deleted architecture. Keep
  only tests that protect active frontend behavior.

## Validation

Use the smallest useful check. UI-only changes require local browser review;
shared client models require focused tests; gateway or service-contract changes
also require `pnpm debug:local:status` and a Railway deployment check.

Run `pnpm build` and `pnpm test` before merging a non-trivial change. Run a
Ponytail simplification pass when available; otherwise record the equivalent
manual deletion/complexity review.

## Release

`package.json` and the first entry in `src/config/changelog.ts` must carry the
same version. Docs-only or refactor-only work does not need a version bump;
patch/minor changes follow the user’s Chinese semver labels.
