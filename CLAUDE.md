# ADSBao — Agent Guide

## Instruction order

User instructions take priority. For this repository, read `AGENTS.md`, then
this file. Read `DESIGN.md` before UI work and `PRODUCT.md` before changing
product behavior or visual direction. Project documents override generic or
imported agent skills when they conflict; use a skill only for a compatible
technique, not to restore retired architecture.

## Architecture boundary

This is the public Vite/React application. The private `adsbao-service`
repository owns every server endpoint, database concern, upstream integration,
and secret. The public Docker image serves the built SPA with Nginx and proxies
`/api`, `/events`, and `/health` to that private service. Do not reintroduce
service code, migrations, credentials, or provider-specific compatibility
branches here.

Realtime is same-origin Server-Sent Events under `/events/...`, consumed with
`EventSource`. `/ws` is deliberately retired and returns 404 in local and
deployed hosts. Vite also proxies `/debug` locally for diagnostics only; Nginx
does not expose that route in deployment. Airport map preferences are
browser-local storage, not account or database state.

## Local development

Adopt existing servers instead of restarting them. The frontend runs on port
3000 and proxies the same-origin API/SSE paths to the private service on
port 8082.

```bash
pnpm debug:local:status
```

Choose the smallest applicable path:

| Change | Start / inspect | Required evidence |
| --- | --- | --- |
| UI-only | `pnpm debug:local` | Inspect the affected route in a real browser; check the relevant theme, responsive state, and `DESIGN.md` checklist. |
| Client logic or model | `pnpm debug:local` | Focused active tests plus browser review when user-visible. |
| API, SSE, proxy, or service contract | `pnpm debug:local:service` | `pnpm debug:local:status`, direct service health, focused contract test, and browser Network inspection when a stream is affected. |
| Physical-device browser POC | `pnpm debug:device` | Open only the printed private-LAN acceptance URL. The command must pass frontend, deep-link, and proxied-health LAN probes before the device run begins. |
| Private Go service | From `../ADSBao-Secret-Service/services/adsbao-service`: `go test ./...` and `PORT=8082 ./run-local.sh` | Verify its documented endpoint contract through Vite as well as directly. |

`debug:local` adopts healthy processes. Use `debug:local:restart` only for an
unhealthy or stale frontend; use `debug:local:service:restart` only when the
private service itself needs restart. The snapshot records `/`, a deep link,
and `/health` plus active debug endpoints. It intentionally does not invent a
feature-flags route.

`debug:device` uses the current private IPv4 address and keeps browser requests
on Vite's same-origin proxy. Use `debug:device:status` for a non-starting
readiness check. For the Three/OSM licensed-provider trial, first place all four
public browser provider fields in ignored `.env.local`, then run
`pnpm debug:device:configured`; that command restarts only the frontend so Vite
can adopt those values. It reports only field counts and the key-free acceptance
URL. A failed LAN probe is a real precondition failure: resolve macOS Local
Network/firewall access or Wi-Fi client isolation rather than bypassing it with
an unrequested public tunnel.

After the phone exports its JSON report, verify the evidence by recomputing the
eleven gates with `pnpm debug:device:report -- <report.json>`. For the licensed
raster gate, use `pnpm debug:device:report:configured -- <report.json>` so an
otherwise passing default-OSM run cannot satisfy the provider requirement. The
verifier must not print the report body or browser-visible provider values.

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

Use the matrix above first. For a non-trivial change, run `pnpm build` and the
relevant active tests before merge. Do not use test-driven development for
visual-only adjustments: inspect the actual browser result instead. A previous
build or deployment is historical evidence, not verification of the current
diff.

For a change that reaches deployment, verify the Railway path after it is
available: `/health`, an SPA deep link, the affected API route, and the
rendered page. For SSE work, inspect the named `/events/...` frames in browser
DevTools; a normal request can remain open, so it is not a WebSocket probe.
Do not deploy merely to validate an unrequested docs-only change.

Run a Ponytail simplification pass when available; otherwise record the
equivalent manual deletion/complexity review.

## Release

`package.json` and the first entry in `src/config/changelog.ts` must carry the
same version. Docs-only or refactor-only work does not need a version bump;
patch/minor changes follow the user’s Chinese semver labels.
