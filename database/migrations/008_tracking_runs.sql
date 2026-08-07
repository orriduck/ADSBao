-- Durable aircraft tracking. A run is a persisted scheduler consumer; it is
-- not a second polling system and observations are the sole durable trace.

create table if not exists runtime.tracking_runs (
  id uuid primary key default gen_random_uuid(),
  callsign text not null,
  aircraft_hex text,
  owner_id text,
  status text not null default 'active',
  started_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  ended_at timestamptz,
  last_position_at timestamptz,
  flightaware_checked_at timestamptz,
  terminal_at timestamptz,
  terminal_source text,
  stop_reason text,
  constraint tracking_runs_callsign_format check (callsign ~ '^[A-Z0-9]{3,8}$'),
  constraint tracking_runs_hex_format check (aircraft_hex is null or aircraft_hex ~ '^[A-F0-9]{6}$'),
  constraint tracking_runs_status_check check (status in ('active', 'lost_signal', 'terminal', 'stopped', 'expired'))
);

create unique index if not exists tracking_runs_one_active_callsign_idx
  on runtime.tracking_runs (callsign)
  where status in ('active', 'lost_signal');

create index if not exists tracking_runs_restore_idx
  on runtime.tracking_runs (expires_at)
  where status in ('active', 'lost_signal');

create table if not exists runtime.tracking_observations (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references runtime.tracking_runs(id) on delete cascade,
  aircraft jsonb not null,
  source text not null default '',
  upstream_at timestamptz,
  received_at timestamptz not null default timezone('utc', now()),
  constraint tracking_observations_aircraft_object check (jsonb_typeof(aircraft) = 'object')
);

create index if not exists tracking_observations_run_received_idx
  on runtime.tracking_observations (run_id, received_at);
