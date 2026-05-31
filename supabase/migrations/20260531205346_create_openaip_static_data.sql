-- OpenAIP-first static aviation data storage.
--
-- ADSBao now treats OpenAIP as the source of truth for airport, runway,
-- frequency, navaid, airspace, reporting-point, and obstacle context. Legacy
-- OurAirports reference tables and FAA-derived runtime data are intentionally
-- not preserved as compatibility surfaces.

drop table if exists public.airports cascade;
drop table if exists public.runways cascade;
drop table if exists public.airport_frequencies cascade;
drop table if exists public.navaids cascade;
drop table if exists public.ourairports_refresh_meta cascade;
drop table if exists public.nearby_airport_cache cascade;

drop function if exists public.set_nearby_airport_cache_updated_at();

create table if not exists public.openaip_airports (
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
  on public.openaip_airports (icao_code)
  where icao_code <> '';

create index if not exists openaip_airports_iata_code_idx
  on public.openaip_airports (iata_code)
  where iata_code <> '';

create index if not exists openaip_airports_country_type_idx
  on public.openaip_airports (country, type);

create index if not exists openaip_airports_name_idx
  on public.openaip_airports (lower(name));

create index if not exists openaip_airports_lat_lon_idx
  on public.openaip_airports (latitude_deg, longitude_deg);

create table if not exists public.openaip_cache (
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
  on public.openaip_cache (resource_type);

create index if not exists openaip_cache_expires_at_idx
  on public.openaip_cache (expires_at);

create or replace function public.set_openaip_cache_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

revoke execute on function public.set_openaip_cache_updated_at()
  from public, anon, authenticated;

drop trigger if exists openaip_cache_set_updated_at
  on public.openaip_cache;

create trigger openaip_cache_set_updated_at
before update on public.openaip_cache
for each row
execute function public.set_openaip_cache_updated_at();

alter table public.openaip_airports enable row level security;
alter table public.openaip_cache enable row level security;

grant select on table public.openaip_airports to anon, authenticated;
grant select, insert, update, delete on table public.openaip_airports to service_role;

grant select, insert, update, delete on table public.openaip_cache to service_role;
grant select, insert, update on table public.openaip_cache to anon, authenticated;

drop policy if exists "OpenAIP airports are readable by everyone"
  on public.openaip_airports;
create policy "OpenAIP airports are readable by everyone"
on public.openaip_airports
for select to anon, authenticated using (true);

drop policy if exists "OpenAIP cache entries are readable"
  on public.openaip_cache;
create policy "OpenAIP cache entries are readable"
on public.openaip_cache
for select to anon, authenticated
using (
  cache_key like 'openaip:%'
  and expires_at > timezone('utc', now())
);

drop policy if exists "OpenAIP cache entries can be inserted"
  on public.openaip_cache;
create policy "OpenAIP cache entries can be inserted"
on public.openaip_cache
for insert to anon, authenticated
with check (
  cache_key like 'openaip:%'
  and jsonb_typeof(query) = 'object'
  and jsonb_typeof(response) in ('object', 'array')
  and expires_at > timezone('utc', now())
  and expires_at <= timezone('utc', now()) + interval '30 days' + interval '5 minutes'
);

drop policy if exists "OpenAIP cache entries can be updated"
  on public.openaip_cache;
create policy "OpenAIP cache entries can be updated"
on public.openaip_cache
for update to anon, authenticated
using (cache_key like 'openaip:%')
with check (
  cache_key like 'openaip:%'
  and jsonb_typeof(query) = 'object'
  and jsonb_typeof(response) in ('object', 'array')
  and expires_at > timezone('utc', now())
  and expires_at <= timezone('utc', now()) + interval '30 days' + interval '5 minutes'
);
