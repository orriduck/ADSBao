# OurAirports static data setup

ADSBao uses [OurAirports](https://ourairports.com/data/) (public domain, refreshed daily) as the global source of truth for airport, runway, frequency, and navaid static data. The dataset is persisted in Supabase so production runtime queries hit an indexed Postgres table instead of re-parsing ~5 MB of CSV per request.

This guide describes the one-time setup the maintainer (not Claude) has to perform.

## What this replaces

| Surface | Old path | New path |
|---|---|---|
| Search | Browser → `airportsapi.com` (`src/services/airport-directory/`) | `GET /api/search?q=...` → Supabase (`src/services/ourairports/ourAirportsQueries.js`) |
| Airport detail (basic info, runways, frequencies, nearby airports, nearby navaids) | Mix of `airportsapi.com`, `airac.net`, hardcoded fallbacks | `GET /api/airport/[ident]` → Supabase (`src/services/airports/airportPageDataService.js`) |
| FAA CIFP | Procedures + runway-threshold overlay only | Unchanged — CIFP was never used for the static fields this migration covers |

The existing browser-side airport directory and the `/api/proxy/airports/nearby` route remain in place for backwards compatibility. UI migration is tracked separately (issue #176).

## Step 1 — apply the database migration

Migration file: `supabase/migrations/20260513140000_create_ourairports_static.sql`.

Creates four tables (`airports`, `runways`, `airport_frequencies`, `navaids`) with the indexes needed by the query layer, plus RLS policies that allow anon SELECT and restrict writes to `service_role`.

Pick one of these depending on how you manage Supabase:

**Option A — Supabase CLI (recommended if you already use it):**

```bash
supabase login                  # if not done already
supabase link --project-ref <your-project-ref>
supabase db push
```

**Option B — paste the SQL into the dashboard:**

1. Open <https://supabase.com/dashboard/project/_/sql>.
2. Paste the contents of `supabase/migrations/20260513140000_create_ourairports_static.sql`, then run.
3. Repeat for `supabase/migrations/20260513150000_create_ourairports_refresh_meta.sql` (powers the auto-refresh — see "Refresh cadence" below).

Verify with:

```sql
select tablename from pg_tables
where schemaname = 'public'
  and tablename in ('airports', 'runways', 'airport_frequencies', 'navaids');
```

You should see all four rows.

## Step 2 — set environment variables

Add the service-role key to your local `.env` (do not commit):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>      # already in .env.example
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>                # NEW — needed by the import script
```

Get the service-role key from **Supabase dashboard → Project Settings → API → service_role (secret)**. It must never reach the browser bundle — only the import script reads it.

For the Vercel deployment you only need `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The import script runs locally (or in a CI job), never inside the serverless functions.

## Step 3 — run the import

```bash
node --env-file=.env scripts/import-ourairports.js
```

Expected console output (counts will fluctuate as OurAirports refreshes daily):

```
[import-ourairports] Downloading airports.csv ...
[import-ourairports] Downloading runways.csv ...
[import-ourairports] Downloading airport-frequencies.csv ...
[import-ourairports] Downloading navaids.csv ...
[import-ourairports] Parsed ~80000 airports
[import-ourairports] Parsed ~45000 runways
[import-ourairports] Parsed ~30000 frequencies
[import-ourairports] Parsed ~12000 navaids
[import-ourairports] Upserting airports ...
... etc ...
[import-ourairports] Done in <n>s
```

The script is **idempotent** — re-running it upserts on primary key (`ident` for airports, `id` for the others). Safe to run on a cron.

## Step 4 — smoke test

With the dev server running (`pnpm run dev`):

```bash
curl 'http://localhost:3000/api/search?q=EGLL'   | jq '.airports[0]'
curl 'http://localhost:3000/api/airport/KBOS'    | jq '.airport,.runways[0],.frequencies[0]'
curl 'http://localhost:3000/api/airport/CYYZ?nearbyRadiusNm=50&nearbyLimit=5' | jq '.nearbyAirports'
```

You should see records sourced from `ourairports` (note the `"source": "ourairports"` field on every response).

## Refresh cadence

The runtime handles this automatically. `/api/search` and `/api/airport/[ident]` fire a background refresh check (`scheduleRefreshIfDue` via Next.js `after()`) after every successful response. If `max(imported_at)` on the OurAirports tables is older than **24 hours**, the next request triggers an import — but the user never waits, because the refresh runs after the response is sent. A singleton row in `public.ourairports_refresh_meta` acts as a soft lock so concurrent staleness triggers don't fan out into N parallel imports.

This requires `SUPABASE_SERVICE_ROLE_KEY` to be set on the runtime (Vercel env vars). Without it, the routes still work — they just serve from whatever's in the DB without auto-refresh.

You can still run `node --env-file=.env scripts/import-ourairports.js` manually whenever you want to force a refresh.

## Files added by this migration

```
supabase/migrations/20260513140000_create_ourairports_static.sql

src/services/ourairports/
  ourAirportsCsvSources.js          canonical CSV URLs
  ourAirportsCsvParser.js           RFC 4180 parser (+ test)
  ourAirportsNormalizer.js          CSV → DB row coercion (+ test)
  ourAirportsDownloader.js          fetch + parse helpers
  ourAirportsImporter.js            bulk upsert pipeline (+ test)
  ourAirportsQueries.js             read API for the four tables (+ test)

src/services/airports/
  airportPageDataService.js         service aggregation for airport detail (+ test)

src/app/api/search/route.js
src/app/api/airport/[ident]/route.js

scripts/import-ourairports.js
```

## FAA CIFP — clarification

Issue #168's brief described CIFP as the current source of "partial airport static data". That turned out to be inaccurate. CIFP only powers IFR procedures and runway threshold coordinates for the airport-diagram overlay (everything under `src/services/procedures/` and the runway annotation layer in `src/features/airport-map/`). The new OurAirports pipeline neither imports nor depends on CIFP, and the existing CIFP code is untouched.
