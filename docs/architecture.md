# ADSBao Architecture

ADSBao is a Vercel-first web app for airport lookup, weather context, nearby aircraft visualization, and airport-aware route labels.

## Frontend stack

- React on Next.js App Router.
- Tailwind CSS v4 with DaisyUI.
- Vercel Web Analytics and Speed Insights through the Next.js integrations.
- React component equivalents for the previous VueBits-style UI effects.

## Current product scope

- Search-first airport lookup.
- METAR weather context.
- ADS-B nearby traffic visualization.
- Callsign route labels when route data can be resolved.
- Vercel web deployment.

Legacy desktop distribution, Electron packaging, Homebrew cask publishing, the previous local backend runtime, and previous transcription-oriented UI are not part of the current ADSBao web scope.

## Runtime topology

### Browser-owned airport directory

Airport directory data is requested by the browser and cached by the frontend.

### Vercel data paths

The app uses same-origin Vercel paths for upstream aviation sources that are not directly browser-friendly.

| Path | Upstream | Purpose |
|---|---|---|
| `/api/proxy/metar/:icao` | AviationWeather METAR API | Airport weather context |
| `/api/proxy/aircraft/positions/:lat/:lon/:dist` | adsb.lol | Nearby aircraft positions |
| `/api/proxy/flight-routes/callsign/:callsign` | FlightAware page fetcher | Callsign route lookup |
| `/api/proxy/local-weather/:lat/:lon` | Open-Meteo | Airport-local weather |
| `/api/proxy/procedures/:country/:icao` | FAA CIFP | US procedure and runway overlays |
| `/api/proxy/airports/nearby` | AIRAC | Nearby airport overlays |

These paths are implemented as Next.js Route Handlers under `src/app/api/proxy/**`. The handlers keep upstream access same-origin, validate route and query parameters, apply lightweight per-IP rate limits, reject disallowed browser origins, and cap upstream response body sizes before parsing.

### Vercel security posture

Vercel's platform DDoS mitigation remains enabled automatically for the deployment. The repository does not depend on paid Vercel WAF rate limiting for normal operation; proxy throttling lives in application code so the default deployment path does not require a new paid feature.

Security headers are configured in `next.config.mjs` for all routes. Production branch protection and required review settings are still repository or Vercel dashboard controls rather than application code.

## Local development

```bash
pnpm install
pnpm run dev
```

All proxy paths run through the same Route Handlers during local development and production.

## Release line

The current ADSBao web line starts at `v0.4.0`.

| Version | Meaning |
|---|---|
| `v0.4.0` | Breaking ADSBao web pivot |
| `v0.5.0` | Vercel-first web architecture |
| `v0.6.0` | Vercel observability and production routing |
| `v0.7.0` | Flight route and traffic context |
| `v0.7.1` | Map and mobile polish |
| `v0.8.0` | Next.js Vercel refactor |

`v0.3.x` and earlier are legacy desktop-app history and should not be used as the current ADSBao web product line.
