# ADSBao Data Service

Long-running realtime/data backend for ADSBao. It keeps active ADS-B polling on Fly.io, shares one polling loop per subscribed channel, and pushes aircraft updates to the Next.js frontend over WebSocket.

## Why WebSocket

ADSBao needs bidirectional subscribe/unsubscribe messages, multiple active channels per browser tab, and future user/session or camera channels. WebSocket keeps that as one connection. SSE would be simpler for server-to-client streaming, but each channel change would need extra HTTP control requests or reconnects.

## Channels

- `airport:{icao}`: airport traffic around a known airport. Subscribe with `{ lat, lon, distNm }`.
- `callsign:{callsign}`: tracked flight callsign for `/aircraft/[callsign]`.
- `aircraft:{hex}`: current aircraft by 24-bit ICAO hex.
- `viewport:{lat}:{lon}:{distNm}`: rounded/tiled moving-map traffic channel.
- `bbox:{south},{west},{north},{east}`: rounded bbox channel, capped to a small span.
- `session:{id}` and `camera:{id}`: reserved non-polling scoped channels for future recognition/session workflows.

## Polling

- One active polling loop per normalized channel.
- Multiple sockets subscribing to the same channel share the result.
- Loops stop when the final subscriber leaves.
- Intervals are channel-specific: 3s for airport/callsign/aircraft, 5s for viewport/bbox.
- Polls include jitter, request timeout, provider fallback, backoff after errors, stale error events, and active-channel debug visibility.

## Local Run

From this directory:

```bash
pnpm install
pnpm dev
```

Health and debug:

```bash
curl http://localhost:8080/health
curl http://localhost:8080/debug/channels
```

Point the Next.js frontend at the local WebSocket:

```bash
NEXT_PUBLIC_ADSBAO_REALTIME_URL=ws://localhost:8080/ws pnpm run dev
```

If `NEXT_PUBLIC_ADSBAO_REALTIME_URL` is not set, ADSBao uses the existing Vercel/Next API fetch and polling paths.

## Fly.io

Install `flyctl` on macOS:

```bash
brew install flyctl
```

Or:

```bash
curl -L https://fly.io/install.sh | sh
```

Login and deploy:

```bash
fly auth login
cd services/data-service
fly launch --no-deploy
fly deploy
```

For production Vercel, set:

```bash
NEXT_PUBLIC_ADSBAO_REALTIME_URL=wss://realtime.adsbao.dev/ws
```

Do not commit provider secrets. The first version only uses public ADS-B endpoints and keeps Supabase/slow TTL cache as extension points.
