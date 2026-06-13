# ADSBao Database

ADSBao uses Railway Postgres for server-side persistence. The application only
connects from server code through `src/app/api/dao/*.dao.ts`; do not expose the
database URL through `NEXT_PUBLIC_*` variables.

## Environment

Use one of:

```bash
ADSBAO_DATABASE_URL=postgres://...
DATABASE_URL=postgres://...
```

Optional:

```bash
PGSSLMODE=disable # local non-SSL Postgres only
PGPOOL_MAX=5
```

## Apply Schema

```bash
psql "$ADSBAO_DATABASE_URL" -f database/migrations/001_adsbao_postgres.sql
```

## Import Static Data

```bash
pnpm import:airports
pnpm import:facilities
pnpm import:runways
```

## Supabase Export

If preserving existing user flags, route feedback, or map settings from the old
Supabase project, export only the app-owned tables and restore them into Railway
Postgres after applying the schema. Do not restore Supabase roles, RLS policies,
or platform schemas.

Useful table list:

```text
airports
airport_frequencies
navaids
runway_geometries
flight_route_feedback_reports
user_feature_flags
user_map_settings
openaip_airports
openaip_cache
```
