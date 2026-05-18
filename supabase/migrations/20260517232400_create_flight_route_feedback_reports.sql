-- Community-feedback route overrides. Records persist for analysis; the
-- (expires_at, deleted_at, status) tuple controls whether a row participates
-- in active route-lookup. Soft-deleted rows are never returned by the
-- lookup query (see routeFeedbackReports.dao.js).
create table if not exists public.flight_route_feedback_reports (
  id uuid primary key default gen_random_uuid(),

  cache_key text not null,
  normalized_callsign text not null,

  target_airport_icao text,
  target_airport_iata text,

  origin_icao text not null,
  destination_icao text not null,

  aircraft_hex text,
  aircraft_type text,
  user_hash text,

  feedback_reason text not null default 'missing_route',
  prior_route_payload jsonb,
  route_payload jsonb not null,

  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  deleted_at timestamptz
);

-- Active-override lookup is the hot path; it filters by cache_key and
-- prefers the newest non-expired, non-deleted row. The partial index keeps
-- the structure tight by excluding soft-deleted records entirely.
create index if not exists flight_route_feedback_reports_active_idx
  on public.flight_route_feedback_reports
  (cache_key, expires_at desc, created_at desc)
  where deleted_at is null;

alter table public.flight_route_feedback_reports enable row level security;

grant select, insert, update, delete
  on table public.flight_route_feedback_reports to service_role;
grant select, insert on table public.flight_route_feedback_reports to anon;

drop policy if exists "Route feedback overrides are readable"
  on public.flight_route_feedback_reports;

create policy "Route feedback overrides are readable"
on public.flight_route_feedback_reports
for select
to anon
using (
  deleted_at is null
  and expires_at > timezone('utc', now())
  and status = 'active'
);

drop policy if exists "Route feedback overrides can be inserted"
  on public.flight_route_feedback_reports;

-- Anon inserts are bounded to a 12-hour TTL (with a small skew window) and
-- must contain a non-empty cache_key, callsign, and a route_payload object.
-- This keeps the public surface tight even though the server handler is the
-- intended writer.
create policy "Route feedback overrides can be inserted"
on public.flight_route_feedback_reports
for insert
to anon
with check (
  cache_key <> ''
  and normalized_callsign <> ''
  and origin_icao <> ''
  and destination_icao <> ''
  and feedback_reason in ('missing_route', 'correction')
  and status = 'active'
  and deleted_at is null
  and jsonb_typeof(route_payload) = 'object'
  and (prior_route_payload is null or jsonb_typeof(prior_route_payload) = 'object')
  and expires_at > timezone('utc', now())
  and expires_at <= timezone('utc', now()) + interval '12 hours' + interval '5 minutes'
);
