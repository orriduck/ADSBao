# Architecture

ADSBao is split at the browser boundary:

```text
browser
  | same-origin /, /api, /events, /health
  v
public Vite build served by Nginx
  | static assets and SPA fallback stay public
  | /api, /events, /health proxy over Railway private networking
  v
private adsbao-service (Go)
  | endpoints, persistence, upstream integrations, credentials
```

The public repository owns React rendering, interaction, browser-local state,
and normalized browser contracts. The private service owns operational
behavior, persistence, upstream selection, and secrets. Do not move a service
concern into this repository or expose provider details to the browser.

## Browser routes

| Route | Owner | Notes |
| --- | --- | --- |
| `/` and application deep links | Nginx/static SPA | Unknown application paths fall back to `index.html`. |
| `/api/...` | Private service via Nginx | Browser code uses the same origin. |
| `/events/...` | Private service via Nginx | Server-Sent Events; proxy buffering and cache are disabled. |
| `/health` | Private service via Nginx | Suitable for bounded health checks. |
| `/ws` | Nginx/Vite rejection | Retired transport; intentionally returns 404 instead of SPA fallback. |

Nearby realtime uses the browser's native `EventSource` against `/events/...`.
When validating it, inspect live named frames in browser DevTools; a stream is
expected to stay open. It is not a WebSocket connection.

Airport map preferences are kept in browser `localStorage`. They are neither
an account setting nor a private-service persistence contract.
