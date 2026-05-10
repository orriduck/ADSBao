create table if not exists public.airport_metadata_cache (
  airport_key text primary key,
  icao text not null,
  iata text not null default '',
  code text not null default '',
  name text not null,
  city text not null default '',
  state text not null default '',
  country text not null default '',
  type text not null default '',
  type_label text not null default '',
  lat double precision not null,
  lon double precision not null,
  elevation_ft double precision,
  source text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  inserted_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint airport_metadata_cache_key_format
    check (airport_key ~ '^[A-Z0-9][A-Z0-9 -]{1,120}$'),
  constraint airport_metadata_cache_icao_format
    check (icao = '' or icao ~ '^[A-Z0-9]{3,6}$'),
  constraint airport_metadata_cache_iata_format
    check (iata = '' or iata ~ '^[A-Z0-9]{2,5}$'),
  constraint airport_metadata_cache_country_format
    check (country = '' or country ~ '^[A-Z]{2}$'),
  constraint airport_metadata_cache_location_range
    check (lat between -90 and 90 and lon between -180 and 180)
);

create index if not exists airport_metadata_cache_expires_at_idx
  on public.airport_metadata_cache (expires_at);

create index if not exists airport_metadata_cache_country_type_idx
  on public.airport_metadata_cache (country, type);

alter table public.airport_metadata_cache enable row level security;

grant select, insert, update, delete on table public.airport_metadata_cache to service_role;
grant select, insert, update on table public.airport_metadata_cache to anon;

drop policy if exists "Airport metadata cache rows are readable"
  on public.airport_metadata_cache;

create policy "Airport metadata cache rows are readable"
on public.airport_metadata_cache
for select
to anon
using (true);

drop policy if exists "Airport metadata cache rows can be inserted"
  on public.airport_metadata_cache;

create policy "Airport metadata cache rows can be inserted"
on public.airport_metadata_cache
for insert
to anon
with check (
  airport_key ~ '^[A-Z0-9][A-Z0-9 -]{1,120}$'
  and icao ~ '^[A-Z0-9]{3,6}$'
  and name <> ''
  and jsonb_typeof(metadata) = 'object'
  and lat between -90 and 90
  and lon between -180 and 180
  and expires_at > timezone('utc', now())
  and expires_at <= timezone('utc', now()) + interval '90 days' + interval '5 minutes'
);

drop policy if exists "Airport metadata cache rows can be updated"
  on public.airport_metadata_cache;

create policy "Airport metadata cache rows can be updated"
on public.airport_metadata_cache
for update
to anon
using (airport_key ~ '^[A-Z0-9][A-Z0-9 -]{1,120}$')
with check (
  airport_key ~ '^[A-Z0-9][A-Z0-9 -]{1,120}$'
  and icao ~ '^[A-Z0-9]{3,6}$'
  and name <> ''
  and jsonb_typeof(metadata) = 'object'
  and lat between -90 and 90
  and lon between -180 and 180
  and expires_at > timezone('utc', now())
  and expires_at <= timezone('utc', now()) + interval '90 days' + interval '5 minutes'
);

create or replace function public.set_airport_metadata_cache_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

revoke execute on function public.set_airport_metadata_cache_updated_at()
  from public, anon, authenticated;

drop trigger if exists airport_metadata_cache_set_updated_at
  on public.airport_metadata_cache;

create trigger airport_metadata_cache_set_updated_at
before update on public.airport_metadata_cache
for each row
execute function public.set_airport_metadata_cache_updated_at();
