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
for migration in database/migrations/*.sql; do
  psql "$ADSBAO_DATABASE_URL" -f "$migration"
done
```

## Namespaces

The Railway Postgres service uses one database with schema namespaces:

| Schema | Tables |
|---|---|
| `aviation` | `airports`, `airport_aliases` |
| `ourairports` | `airports`, `airport_frequencies`, `navaids`, `runway_geometries` |
| `spotter` | `spotter_locations` |
| `app_user` | `user_map_settings`, `user_feature_flags` |
| `runtime` | `flight_route_feedback_reports`, `openaip_cache` |
| `openaip` | `openaip_airports` |

`aviation.airports` is the canonical ADSBao airport identity cache. Source
tables keep upstream keys, while app queries should resolve ICAO, IATA,
OurAirports, and OpenAIP aliases through `aviation.airport_aliases` first.

After manually changing airport source tables, refresh the identity cache:

```sql
select aviation.refresh_airport_identity_cache();
```

## Import Static Data

```bash
pnpm import:airports
pnpm import:facilities
pnpm import:runways
```
