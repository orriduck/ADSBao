-- Spotter locations: plane spotting positions near airports.
-- Data sourced from spotterguide.net (rewritten, factual data only).

create schema if not exists spotter;

create table if not exists spotter.spotter_locations (
  id uuid primary key default gen_random_uuid(),
  airport_icao text not null,
  airport_name text not null default '',
  latitude_deg double precision not null,
  longitude_deg double precision not null,
  title text not null default '',
  category text not null default '',
  what text not null default '',
  where_text text not null default '',
  when_text text not null default '',
  misc text not null default '',
  focal_length text not null default '',
  source_uri text not null default '',
  source_attribution text not null default 'spotterguide.net',
  inserted_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint spotter_locations_lat_range
    check (latitude_deg between -90 and 90),
  constraint spotter_locations_lon_range
    check (longitude_deg between -180 and 180),
  constraint spotter_locations_icao_format
    check (airport_icao ~ '^[A-Z0-9]{4}$')
);

create index if not exists spotter_locations_airport_icao_idx
  on spotter.spotter_locations (airport_icao);

create index if not exists spotter_locations_lat_lon_idx
  on spotter.spotter_locations (latitude_deg, longitude_deg);

create or replace function spotter.set_spotter_locations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists spotter_locations_set_updated_at
  on spotter.spotter_locations;

create trigger spotter_locations_set_updated_at
before update on spotter.spotter_locations
for each row
execute function spotter.set_spotter_locations_updated_at();
