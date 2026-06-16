---
name: adsbao-local-debug
description: Use when working in /Users/ruyyi/Devs/ADSBao and you need to start, adopt, restart, or inspect the local Vite frontend on port 3000, the optional local Go data-service behind Vite's proxy, or a local debug snapshot for browser-visible validation.
---

# ADSBao Local Debug

Use this skill before local browser validation, UI debugging, WebSocket/API
debugging, or any task where the local app must be running.

## Start Fast

1. Read `CLAUDE.md` first and choose the validation mode.
2. For frontend-only work, run:
   ```bash
   pnpm debug:local
   ```
   This adopts a healthy port 3000 server or starts `pnpm run dev` in the
   `adsbao-dev` tmux session.
3. For API, WebSocket, or feature-flag work that needs the local Go proxy target,
   run:
   ```bash
   pnpm debug:local:service
   ```
   This also starts `services/data-service` on the same local API origin Vite
   proxies to, currently `http://localhost:8081` unless overridden by
   `VITE_ADSBAO_LOCAL_API_ORIGIN` or `ADSBAO_LOCAL_API_ORIGIN`.
4. If the browser shows stale CSS/JS or removed DOM still appears, run:
   ```bash
   pnpm debug:local:restart
   ```
   Then hard-reload the browser before rechecking.

## Track The Effect

Use the generated snapshot after each local debug pass:

```bash
pnpm debug:local:status
```

The command writes:

- `.codex-tmp/local-debug/latest.md`
- `.codex-tmp/local-debug/latest.json`
- timestamped JSON snapshots in `.codex-tmp/local-debug/`

The snapshot records the git branch/sha, frontend route health, Vite proxy
health for `/health`, `/api/feature-flags`, `/debug/channels`, and direct local
Go data-service endpoint health.

## Decision Rules

- Adopt a healthy server; do not restart it just because it exists.
- Restart when the port is unhealthy, the rendered browser is stale, or
  `CLAUDE.md`'s stale-bundle symptoms are present.
- Use `--service` only when the task needs local Go/API/WebSocket behavior.
  Frontend-only UI polish can use `pnpm debug:local`.
- Do not treat a failed local Go check as a frontend failure unless the task
  depends on `/api`, `/health`, `/debug`, or `/ws`.
