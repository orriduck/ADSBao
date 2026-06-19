-- Spotter locations: plane spotting positions near airports.
-- Data sourced from spotterguide.net (rewritten, factual data only).

create schema if not exists spotter;

create table if not exists spotter.spotter_locations (
  id uuid primary key default gen_random_uuid(),
  airport_ident text not null default '',
  spot_number integer,
  latitude_deg double precision not null,
  longitude_deg double precision not null,
  title text not null default '',
  category text not null default '',
  what text not null default '',
  where_text text not null default '',
  when_text text not null default '',
  misc text not null default '',
  focal_length text not null default '',
  source text not null default 'spotterguide',
  source_key text not null default '',
  source_uri text not null default '',
  source_attribution text not null default 'spotterguide.net',
  source_page_title text not null default '',
  source_map_url text not null default '',
  source_modified_at timestamptz,
  inserted_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint spotter_locations_lat_range
    check (latitude_deg between -90 and 90),
  constraint spotter_locations_lon_range
    check (longitude_deg between -180 and 180),
  constraint spotter_locations_airport_ident_format
    check (airport_ident ~ '^[A-Z0-9]{2,32}$'),
  constraint spotter_locations_spot_number_positive
    check (spot_number is null or spot_number > 0),
  constraint spotter_locations_source_key_present
    check (source_key <> '')
);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'spotter'
      and table_name = 'spotter_locations'
      and column_name = 'source_key'
  ) then
    create unique index if not exists spotter_locations_source_key_idx
      on spotter.spotter_locations (source_key);
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'spotter'
      and table_name = 'spotter_locations'
      and column_name = 'airport_ident'
  ) then
    create index if not exists spotter_locations_airport_ident_idx
      on spotter.spotter_locations (airport_ident);

    create index if not exists spotter_locations_airport_spot_number_idx
      on spotter.spotter_locations (airport_ident, spot_number);
  end if;
end $$;

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
