# ADSBao

A modern airport-monitoring HUD with dynamic airport search, METAR context, and nearby aircraft overlays.

<img width="2976" height="2142" alt="image" src="https://github.com/user-attachments/assets/ca26b63a-2f88-4f04-90fe-a5c818166f3a" />
<img width="2984" height="2146" alt="image" src="https://github.com/user-attachments/assets/d6385986-6fb8-4dc0-9736-fe13031e31ae" />
<img width="2974" height="2140" alt="image" src="https://github.com/user-attachments/assets/fb8ab85d-7a0f-45c5-b4d3-72be3d8b1bb5" />
<img width="2980" height="2140" alt="image" src="https://github.com/user-attachments/assets/47c8a27f-f5ac-4d9a-8d0b-e20b9897bc66" />

## Overview
ADSBao provides a search-first airport operations view with weather context and aircraft position overlays. Airport search is backed by public airport directory data.

Current web app version: **1.2.1**. See `src/config/changelog.js` (rendered at `/changelog`) for product version history.

## Tech Stack
- **Frontend**: React on Next.js App Router, Tailwind CSS v4, DaisyUI, Lucide Icons.
- **Vercel UX integrations**: Vercel Web Analytics and Speed Insights use their Next.js packages.
- **Component migration**: Former VueBits-style effects are implemented as React components.
- **Data access**: OurAirports static data (airports, runways, frequencies, navaids) persisted in Supabase and served through `/api/search` and `/api/airport/[ident]`.
- **Vercel routing**: Same-origin Vercel rewrites for AviationWeather METAR and adsb.lol aircraft positions, plus a Next.js route handler for VRS standing-data callsign route lookup.
- **Typography**: Google Sans Flex & Google Sans Code.

## Getting Started

### Prerequisites
- Node.js 24+ & [pnpm](https://pnpm.io/installation)

### Frontend Setup
```bash
pnpm install
pnpm run dev
```

The dev server starts on `http://localhost:3000` unless that port is already in use.

### Vercel Web Deployment
The repo includes `vercel.json` for Git-triggered Vercel builds with same-origin data paths for browser-blocked upstream data.

```bash
vercel
```

The deployment path intentionally keeps upstream ownership visible: airport search and airport detail hit `/api/search` and `/api/airport/[ident]` backed by Supabase-hosted OurAirports data, `/api/proxy/metar/:icao` rewrites to AviationWeather, `/api/proxy/aircraft/positions/:lat/:lon/:dist` rewrites to adsb.lol, and `/api/proxy/flight-routes/callsign/:callsign` routes through the Next.js Route Handler. Static airport data is bulk-loaded from OurAirports into Supabase via `node --env-file=.env scripts/import-ourairports.js`.

### Verification
```bash
pnpm test
pnpm build
```

`pnpm test` discovers every `*.test.js` file and runs the full remaining critical mechanism suite. Do not add package scripts for individual tests; if a test file exists, it is part of the full suite.

For UI/component behavior, verify the running app instead of adding copy or toggle-level tests. Use `pnpm run dev` for local checks at `http://localhost:3000`. For pushed branches, Vercel Git integration creates preview deployments; check the PR deployment URL or run `vercel list --environment preview`, then inspect or hit protected previews with `vercel inspect <preview-url>` and `vercel curl / --deployment <preview-url>`.

---

## Contributing

We welcome contributions! Here's how to set up the development environment:

### Prerequisites
- Node.js 24+ with [pnpm](https://pnpm.io/installation)
- Git

### Running locally

**1. Clone the repo**
```bash
git clone https://github.com/orriduck/ADSBao.git
cd ADSBao
```

**2. Start the frontend**
```bash
pnpm install                     # install Node dependencies
pnpm run dev                     # Next.js dev server with HMR
```
Frontend available at `http://localhost:3000` by default.

### Project structure
```
ADSBao/
├── docs/                  # Current architecture notes
├── scripts/               # Data import and maintenance scripts
├── src/
│   ├── app/               # Next.js pages, API routes, API shared helpers, and DAOs
│   ├── components/        # JSX components grouped by screen/domain
│   ├── features/
│   │   ├── aircraft/      # Aircraft filters, icons, photos, positions, preview, and trace logic
│   │   ├── airport/       # Airport context, directory, explorer, map, nearby, procedures, search, and wiki logic
│   │   ├── aviation/      # Shared aviation clients and flight-route mechanisms
│   │   ├── weather/       # Weather models and METAR integration
│   │   ├── about/         # About-page view models
│   │   └── app-shell/     # Theme preference state and helpers
│   ├── hooks/             # Shared React hooks
│   ├── config/            # Runtime and provider configuration
│   ├── constants/         # Shared product constants
│   ├── data/              # Static fallback and metadata files
│   └── utils/             # Cross-feature pure helpers
├── package.json
└── vercel.json       # Vercel deployment config
```

JSX belongs under `src/components/**`. Feature mechanisms, models, clients, hooks, and utilities live with their owning feature domain as plain `.js` modules. API persistence boundaries stay under `src/app/api/dao`, and route-handler-only helpers stay under `src/app/api/_shared`.

## External Data Use
ADSBao uses public aviation data sources and avoids intentionally high-volume polling. The aircraft overlay polls every 3 seconds by default, and airport directory results are cached in the browser for six hours. See `docs/architecture.md` for endpoint decisions, Vercel routing, and release-line context.

## Release Policy
Vercel deploys every push to `main`, but deployments are not product releases. Product versions are bumped only when user-visible product scope changes, production behavior changes, or fixes should be documented in `CHANGELOG.md`.
