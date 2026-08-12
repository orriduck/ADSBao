---
name: adsbao-railway-staging-deploy
description: Use when working in /Users/ruyyi/Devs/ADSBao and the user asks to deploy, redeploy, inspect, validate, or branch-route the Railway staging service without touching production.
---

# ADSBao Railway Staging Deploy

Use this for ADSBao staging deploys and validation. Staging is a separate
Railway app service in the `production` environment, not a separate database.

## Facts

| Item | Value |
|---|---|
| Production service | `adsbao-app` |
| Staging service | `adsbao-staging` |
| Railway environment | `production` |
| Staging URL | `https://adsbao-staging-production.up.railway.app` |

The application does not use a public feature-flags endpoint, account-backed
map settings, or WebSocket realtime. Do not add staging-only variables or
validation probes for those retired paths.

## Rules

- Read `CLAUDE.md` first and choose the applicable validation path.
- Never rely on the currently linked Railway service for staging operations.
- Always pass `--service adsbao-staging --environment production`.
- Do not print raw Railway variable values; use redaction or presence checks.
- Leave the local CLI linked back to `adsbao-app` before finishing.
- Do not change the staging source branch unless the user explicitly asks.

## Deploy Commands

Deploy the latest commit from staging's configured GitHub source:

```bash
railway redeploy --service adsbao-staging --environment production --from-source --yes
```

Upload the current local worktree to staging only:

```bash
railway up --service adsbao-staging --environment production
```

Rerun the current staging deployment without pulling a newer commit:

```bash
railway redeploy --service adsbao-staging --environment production --yes
```

If the user wants pushes to deploy staging without deploying production, connect
staging to a non-`main` branch such as `staging`:

```bash
railway service source connect --repo orriduck/ADSBao --branch staging --service adsbao-staging --environment production
```

## Validation

After deploys, check deployment metadata and the deployed service:

```bash
railway deployment list --service adsbao-staging --environment production --json
curl -fsS https://adsbao-staging-production.up.railway.app/health | jq .
curl -fsSI https://adsbao-staging-production.up.railway.app/aircraft/N123AB | sed -n '1,20p'
curl -fsSI https://adsbao-staging-production.up.railway.app/airport/KBOS | sed -n '1,20p'
```

If the deployed change affects SSE, open the affected route in a browser and
inspect named `/events/...` frames in DevTools. Do not use a WebSocket probe or
treat an intentionally open SSE response as a timeout failure.

For env validation, only print presence or known non-secret values:

```bash
railway run --service adsbao-staging --environment production -- sh -lc 'printf "DATABASE_URL_SET=%s\nALLOWED_EVENT_ORIGINS_SET=%s\n" "$([ -n "$DATABASE_URL" ] && echo yes || echo no)" "$([ -n "$ALLOWED_EVENT_ORIGINS" ] && echo yes || echo no)"'
```

Finish by restoring the default local CLI target:

```bash
railway service link adsbao-app
```
