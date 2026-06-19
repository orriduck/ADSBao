-- ADSBao Railway Postgres schema.
--
-- This migration owns ADSBao persistence in Railway Postgres.
-- Application code reaches these tables only from server-side DAO helpers.

create extension if not exists pgcrypto;

create schema if not exists ourairports;
create schema if not exists app_user;
create schema if not exists runtime;
create schema if not exists openaip;

create table if not exists ourairports.airports (
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
  on ourairports.airports (icao_code)
  where icao_code <> '';

create index if not exists airports_iata_code_idx
  on ourairports.airports (iata_code)
  where iata_code <> '';

create table if not exists ourairports.airport_frequencies (
  id bigint primary key,
  airport_ref bigint,
  airport_ident text not null,
  type text not null default '',
  description text not null default '',
  frequency_mhz double precision,
  imported_at timestamptz not null default timezone('utc', now()),
  constraint airport_frequencies_airport_ident_format
    check (airport_ident ~ '^[A-Z0-9]{2,8}$'),
  constraint airport_frequencies_frequency_positive
    check (frequency_mhz is null or frequency_mhz > 0)
);

create index if not exists airport_frequencies_airport_ident_idx
  on ourairports.airport_frequencies (airport_ident);

create table if not exists ourairports.navaids (
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
  ),
  constraint navaids_dme_latitude_range check (
    dme_latitude_deg is null or dme_latitude_deg between -90 and 90
  ),
  constraint navaids_dme_longitude_range check (
    dme_longitude_deg is null or dme_longitude_deg between -180 and 180
  )
);

create index if not exists navaids_associated_airport_idx
  on ourairports.navaids (associated_airport)
  where associated_airport <> '';

create index if not exists navaids_lat_lon_idx
  on ourairports.navaids (latitude_deg, longitude_deg);

create table if not exists ourairports.runway_geometries (
  source text not null,
  source_id text not null,
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
  imported_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (source, source_id),
  constraint runway_geometries_source_known
    check (source in ('ourairports')),
  constraint runway_geometries_airport_ident_format
    check (airport_ident ~ '^[A-Z0-9]{2,16}$'),
  constraint runway_geometries_le_latitude_range
    check (le_latitude_deg is null or le_latitude_deg between -90 and 90),
  constraint runway_geometries_he_latitude_range
    check (he_latitude_deg is null or he_latitude_deg between -90 and 90),
  constraint runway_geometries_le_longitude_range
    check (le_longitude_deg is null or le_longitude_deg between -180 and 180),
  constraint runway_geometries_he_longitude_range
    check (he_longitude_deg is null or he_longitude_deg between -180 and 180)
);

create index if not exists runway_geometries_airport_ident_idx
  on ourairports.runway_geometries (airport_ident);

create index if not exists runway_geometries_source_airport_idx
  on ourairports.runway_geometries (source, airport_ident);

create or replace function ourairports.set_runway_geometries_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists runway_geometries_set_updated_at
  on ourairports.runway_geometries;

create trigger runway_geometries_set_updated_at
before update on ourairports.runway_geometries
for each row
execute function ourairports.set_runway_geometries_updated_at();

create table if not exists runtime.flight_route_feedback_reports (
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
  deleted_at timestamptz,
  constraint flight_route_feedback_reports_payload_object
    check (jsonb_typeof(route_payload) = 'object'),
  constraint flight_route_feedback_reports_prior_payload_object
    check (prior_route_payload is null or jsonb_typeof(prior_route_payload) = 'object'),
  constraint flight_route_feedback_reports_reason_check
    check (feedback_reason in ('missing_route', 'correction')),
  constraint flight_route_feedback_reports_status_check
    check (status in ('active', 'deleted'))
);

create index if not exists flight_route_feedback_reports_active_callsign_idx
  on runtime.flight_route_feedback_reports
  (normalized_callsign, expires_at desc, created_at desc)
  where deleted_at is null and status = 'active';

create table if not exists app_user.user_feature_flags (
  email text not null,
  environment text not null default 'production',
  flags jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (email, environment),
  constraint user_feature_flags_email_normalized check (
    email = lower(btrim(email))
    and email <> ''
    and position('@' in email) > 1
  ),
  constraint user_feature_flags_environment_check
    check (environment in ('local', 'preview', 'production')),
  constraint user_feature_flags_flags_object
    check (jsonb_typeof(flags) = 'object')
);

create table if not exists app_user.user_map_settings (
  email text not null,
  environment text not null default 'production',
  device text not null default 'desktop',
  settings jsonb not null default '{}'::jsonb,
  has_selected_mode boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (email, environment, device),
  constraint user_map_settings_email_normalized check (
    email = lower(btrim(email))
    and email <> ''
    and position('@' in email) > 1
  ),
  constraint user_map_settings_environment_check
    check (environment in ('local', 'preview', 'production')),
  constraint user_map_settings_device_check
    check (device in ('desktop', 'mobile')),
  constraint user_map_settings_settings_object
    check (jsonb_typeof(settings) = 'object')
);

create table if not exists openaip.openaip_airports (
  openaip_id text primary key,
  icao_code text not null default '',
  iata_code text not null default '',
  alt_identifier text not null default '',
  name text not null default '',
  country text not null default '',
  type integer,
  latitude_deg double precision,
  longitude_deg double precision,
  elevation_ft double precision,
  updated_at_upstream timestamptz,
  payload jsonb not null,
  imported_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint openaip_airports_payload_object
    check (jsonb_typeof(payload) = 'object'),
  constraint openaip_airports_icao_format
    check (icao_code = '' or icao_code ~ '^[A-Z0-9]{3,4}$'),
  constraint openaip_airports_iata_format
    check (iata_code = '' or iata_code ~ '^[A-Z0-9]{3}$'),
  constraint openaip_airports_country_format
    check (country = '' or country ~ '^[A-Z]{2}$'),
  constraint openaip_airports_latitude_range
    check (latitude_deg is null or latitude_deg between -90 and 90),
  constraint openaip_airports_longitude_range
    check (longitude_deg is null or longitude_deg between -180 and 180)
);

create index if not exists openaip_airports_icao_code_idx
  on openaip.openaip_airports (icao_code)
  where icao_code <> '';

create index if not exists openaip_airports_iata_code_idx
  on openaip.openaip_airports (iata_code)
  where iata_code <> '';

create index if not exists openaip_airports_country_type_idx
  on openaip.openaip_airports (country, type);

create index if not exists openaip_airports_name_idx
  on openaip.openaip_airports (lower(name));

create index if not exists openaip_airports_lat_lon_idx
  on openaip.openaip_airports (latitude_deg, longitude_deg);

create table if not exists runtime.openaip_cache (
  cache_key text primary key,
  resource_type text not null,
  query jsonb not null,
  response jsonb not null,
  expires_at timestamptz not null,
  inserted_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint openaip_cache_key_format
    check (cache_key like 'openaip:%'),
  constraint openaip_cache_query_object
    check (jsonb_typeof(query) = 'object'),
  constraint openaip_cache_response_valid
    check (jsonb_typeof(response) in ('object', 'array'))
);

create index if not exists openaip_cache_resource_type_idx
  on runtime.openaip_cache (resource_type);

create index if not exists openaip_cache_expires_at_idx
  on runtime.openaip_cache (expires_at);

create or replace function runtime.set_openaip_cache_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists openaip_cache_set_updated_at
  on runtime.openaip_cache;

create trigger openaip_cache_set_updated_at
before update on runtime.openaip_cache
for each row
execute function runtime.set_openaip_cache_updated_at();
