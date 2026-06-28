-- Short-lived server-side cache for upstream aircraft trace + flight route
-- lookups. Both upstreams (adsb.lol traces, adsbdb/FlightAware routes) are
-- rate-limited or quota'd, and the tracked-flight page re-fetches them every
-- time the user navigates away and back (detail-page navigation is a hard
-- reload, so in-process caches die). These tables let the data-service serve a
-- recently-fetched result without hitting the upstream, shared across users.
--
-- The data-service treats both tables as best-effort: missing rows, missing
-- tables, or query errors all fall back to a direct upstream fetch, so the app
-- keeps working even before this migration is applied.

create schema if not exists runtime;

-- Rolling "recent" aircraft trace, keyed by ICAO hex (the trace endpoint only
-- ever sees the hex, never the callsign). Full traces are multi-MB and are
-- intentionally NOT cached here — they stay client-side (localStorage seed).
create table if not exists runtime.aircraft_trace_cache (
  hex        text primary key,
  response   jsonb not null,
  fetched_at timestamptz not null default now()
);

create index if not exists aircraft_trace_cache_fetched_at_idx
  on runtime.aircraft_trace_cache (fetched_at);

-- Resolved flight route, keyed by callsign AND provider. FlightAware and adsbdb
-- are mutually exclusive providers (product guardrail): a row written by one
-- provider must never be served to the other, so provider is part of the key.
create table if not exists runtime.flight_route_cache (
  callsign   text not null,
  provider   text not null,
  route      jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (callsign, provider)
);

create index if not exists flight_route_cache_fetched_at_idx
  on runtime.flight_route_cache (fetched_at);
