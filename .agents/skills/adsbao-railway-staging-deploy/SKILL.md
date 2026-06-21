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
| Staging flag env | `FEATURE_FLAGS_ENV=preview` |

Staging shares production Postgres through Railway reference variables such as
`${{Postgres.DATABASE_URL}}`, but `FEATURE_FLAGS_ENV=preview` keeps feature
flags and map settings logically separate from production rows.

## Rules

- Read `CLAUDE.md` first and pick the validation mode.
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
curl -fsS https://adsbao-staging-production.up.railway.app/api/feature-flags | jq .
curl -fsSI https://adsbao-staging-production.up.railway.app/aircraft/N123AB | sed -n '1,20p'
node -e 'const ws=new WebSocket("wss://adsbao-staging-production.up.railway.app/ws"); const t=setTimeout(()=>process.exit(1),8000); ws.addEventListener("open",()=>{clearTimeout(t); console.log("ws open"); ws.close(1000,"done")}); ws.addEventListener("error",()=>process.exit(1));'
```

For env validation, only print presence or known non-secret values:

```bash
railway run --service adsbao-staging --environment production -- sh -lc 'printf "FEATURE_FLAGS_ENV=%s\nFLIGHTAWARE_ACCESS_ENABLED=%s\nDATABASE_URL_SET=%s\n" "$FEATURE_FLAGS_ENV" "$FLIGHTAWARE_ACCESS_ENABLED" "$([ -n "$DATABASE_URL" ] && echo yes || echo no)"'
```

Finish by restoring the default local CLI target:

```bash
railway service link adsbao-app
```
