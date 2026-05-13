-- OurAirports static reference tables.
--
-- These tables hold global airport, runway, frequency, and navaid data sourced
-- from OurAirports (https://ourairports.com/data/) and refreshed by the
-- `pnpm import:ourairports` script using the service_role key. Anon clients
-- have read-only access; only service_role can write.

create table if not exists public.airports (
  ident text primary key,
  ourairports_id bigint,
  type text not null default '',
  name text not null default '',
  latitude_deg double precision,
  longitude_deg double precision,
  elevation_ft double precision,
  continent text not null default '',
  iso_country text not null default '',
  iso_region text not null default '',
  municipality text not null default '',
  scheduled_service boolean not null default false,
  icao_code text not null default '',
  iata_code text not null default '',
  gps_code text not null default '',
  local_code text not null default '',
  home_link text not null default '',
  wikipedia_link text not null default '',
  keywords text not null default '',
  source text not null default 'ourairports',
  imported_at timestamptz not null default timezone('utc', now()),
  constraint airports_latitude_range check (
    latitude_deg is null or latitude_deg between -90 and 90
  ),
  constraint airports_longitude_range check (
    longitude_deg is null or longitude_deg between -180 and 180
  )
);

create index if not exists airports_iata_code_idx
  on public.airports (iata_code)
  where iata_code <> '';

create index if not exists airports_icao_code_idx
  on public.airports (icao_code)
  where icao_code <> '';

create index if not exists airports_iso_country_type_idx
  on public.airports (iso_country, type);

create index if not exists airports_municipality_idx
  on public.airports (lower(municipality));

create index if not exists airports_name_idx
  on public.airports (lower(name));

create index if not exists airports_lat_lon_idx
  on public.airports (latitude_deg, longitude_deg);

create table if not exists public.runways (
  id bigint primary key,
  airport_ref bigint,
  airport_ident text not null,
  length_ft double precision,
  width_ft double precision,
  surface text not null default '',
  lighted boolean not null default false,
  closed boolean not null default false,
  le_ident text not null default '',
  le_latitude_deg double precision,
  le_longitude_deg double precision,
  le_elevation_ft double precision,
  le_heading_deg_t double precision,
  le_displaced_threshold_ft double precision,
  he_ident text not null default '',
  he_latitude_deg double precision,
  he_longitude_deg double precision,
  he_elevation_ft double precision,
  he_heading_deg_t double precision,
  he_displaced_threshold_ft double precision,
  imported_at timestamptz not null default timezone('utc', now())
);

create index if not exists runways_airport_ident_idx
  on public.runways (airport_ident);

create table if not exists public.airport_frequencies (
  id bigint primary key,
  airport_ref bigint,
  airport_ident text not null,
  type text not null default '',
  description text not null default '',
  frequency_mhz double precision,
  imported_at timestamptz not null default timezone('utc', now())
);

create index if not exists airport_frequencies_airport_ident_idx
  on public.airport_frequencies (airport_ident);

create table if not exists public.navaids (
  id bigint primary key,
  filename text not null default '',
  ident text not null default '',
  name text not null default '',
  type text not null default '',
  frequency_khz double precision,
  latitude_deg double precision,
  longitude_deg double precision,
  elevation_ft double precision,
  iso_country text not null default '',
  dme_frequency_khz double precision,
  dme_channel text not null default '',
  dme_latitude_deg double precision,
  dme_longitude_deg double precision,
  dme_elevation_ft double precision,
  slaved_variation_deg double precision,
  magnetic_variation_deg double precision,
  usage_type text not null default '',
  power text not null default '',
  associated_airport text not null default '',
  imported_at timestamptz not null default timezone('utc', now()),
  constraint navaids_latitude_range check (
    latitude_deg is null or latitude_deg between -90 and 90
  ),
  constraint navaids_longitude_range check (
    longitude_deg is null or longitude_deg between -180 and 180
  )
);

create index if not exists navaids_associated_airport_idx
  on public.navaids (associated_airport)
  where associated_airport <> '';

create index if not exists navaids_lat_lon_idx
  on public.navaids (latitude_deg, longitude_deg);

-- RLS: anon may read; only service_role may write.
alter table public.airports enable row level security;
alter table public.runways enable row level security;
alter table public.airport_frequencies enable row level security;
alter table public.navaids enable row level security;

grant select on table public.airports to anon, authenticated;
grant select on table public.runways to anon, authenticated;
grant select on table public.airport_frequencies to anon, authenticated;
grant select on table public.navaids to anon, authenticated;

grant select, insert, update, delete on table public.airports to service_role;
grant select, insert, update, delete on table public.runways to service_role;
grant select, insert, update, delete on table public.airport_frequencies to service_role;
grant select, insert, update, delete on table public.navaids to service_role;

drop policy if exists "Airports are readable by everyone" on public.airports;
create policy "Airports are readable by everyone"
on public.airports for select to anon, authenticated using (true);

drop policy if exists "Runways are readable by everyone" on public.runways;
create policy "Runways are readable by everyone"
on public.runways for select to anon, authenticated using (true);

drop policy if exists "Airport frequencies are readable by everyone"
  on public.airport_frequencies;
create policy "Airport frequencies are readable by everyone"
on public.airport_frequencies for select to anon, authenticated using (true);

drop policy if exists "Navaids are readable by everyone" on public.navaids;
create policy "Navaids are readable by everyone"
on public.navaids for select to anon, authenticated using (true);
