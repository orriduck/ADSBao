-- Restore a narrow OurAirports `airports` table used to augment OpenAIP airport
-- names. OpenAIP remains the primary airport directory, but its `name` values
-- are pre-uppercased and truncated (~40 chars), so long names render cut off
-- mid-word (e.g. "GENERAL EDWARD LAWRENCE LOGAN INTERNATIO"). This table
-- provides the full, mixed-case OurAirports name (and municipality) keyed by
-- identifier so the directory layer can override the truncated OpenAIP value.
--
-- Refreshed by the `pnpm import:airports` script using the service_role key.
-- Anon clients have read-only access; only service_role can write.

create table if not exists public.airports (
  ident text primary key,
  ourairports_id bigint,
  type text not null default '',
  name text not null default '',
  latitude_deg double precision,
  longitude_deg double precision,
  iso_country text not null default '',
  municipality text not null default '',
  icao_code text not null default '',
  iata_code text not null default '',
  source text not null default 'ourairports',
  imported_at timestamptz not null default timezone('utc', now()),
  constraint airports_latitude_range check (
    latitude_deg is null or latitude_deg between -90 and 90
  ),
  constraint airports_longitude_range check (
    longitude_deg is null or longitude_deg between -180 and 180
  )
);

create index if not exists airports_icao_code_idx
  on public.airports (icao_code)
  where icao_code <> '';

create index if not exists airports_iata_code_idx
  on public.airports (iata_code)
  where iata_code <> '';

-- RLS: anon may read; only service_role may write.
alter table public.airports enable row level security;

grant select on table public.airports to anon, authenticated;
grant select, insert, update, delete on table public.airports to service_role;

drop policy if exists "Airports are readable by everyone" on public.airports;
create policy "Airports are readable by everyone"
on public.airports for select to anon, authenticated using (true);
