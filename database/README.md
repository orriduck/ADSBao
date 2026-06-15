# ADSBao Database

ADSBao uses Railway Postgres for server-side persistence. The application only
connects from server code through `src/server/dao/*.dao.ts`; do not expose the
database URL through `VITE_*` variables.

## Environment

```bash
ADSBAO_DATABASE_URL=postgres://...
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
