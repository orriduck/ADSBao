---
description: Deploy or validate the ADSBao Railway staging service only
argument-hint: "[latest|local|rerun|status|branch <name>]"
---

# Deploy ADSBao Staging

Work from `/Users/ruyyi/Devs/ADSBao`. Read `CLAUDE.md` first and follow its
validation mode rules. This command targets Railway staging only:

- Railway service: `adsbao-staging`
- Railway environment: `production`
- Staging URL: `https://adsbao-staging-production.up.railway.app`
- Production service remains: `adsbao-app`

Never rely on the locally linked Railway service for staging deploys. Always
include `--service adsbao-staging --environment production`.

Interpret `$ARGUMENTS`:

- Empty, `latest`, or `from-source`: deploy the latest commit from the
  configured GitHub source:
  ```bash
  railway redeploy --service adsbao-staging --environment production --from-source --yes
  ```
- `local` or `upload`: upload the current local worktree to staging:
  ```bash
  railway up --service adsbao-staging --environment production
  ```
- `rerun` or `current`: rerun the current staging deployment without pulling a
  newer commit:
  ```bash
  railway redeploy --service adsbao-staging --environment production --yes
  ```
- `status`: do not deploy; inspect current staging status and validate.
- `branch <name>`: only if explicitly requested, connect staging to that branch:
  ```bash
  railway service source connect --repo orriduck/ADSBao --branch <name> --service adsbao-staging --environment production
  ```

After any deploy or status request, validate:

```bash
railway deployment list --service adsbao-staging --environment production --json
curl -fsS https://adsbao-staging-production.up.railway.app/health | jq .
curl -fsS https://adsbao-staging-production.up.railway.app/api/feature-flags | jq .
curl -fsSI https://adsbao-staging-production.up.railway.app/aircraft/N123AB | sed -n '1,20p'
node -e 'const ws=new WebSocket("wss://adsbao-staging-production.up.railway.app/ws"); const t=setTimeout(()=>process.exit(1),8000); ws.addEventListener("open",()=>{clearTimeout(t); console.log("ws open"); ws.close(1000,"done")}); ws.addEventListener("error",()=>process.exit(1));'
```

Do not print raw Railway variable values. If env validation is needed, use
presence checks:

```bash
railway run --service adsbao-staging --environment production -- sh -lc 'printf "FEATURE_FLAGS_ENV=%s\nDATABASE_URL_SET=%s\n" "$FEATURE_FLAGS_ENV" "$([ -n "$DATABASE_URL" ] && echo yes || echo no)"'
```

Before finishing, link the local Railway CLI back to production:

```bash
railway service link adsbao-app
```
