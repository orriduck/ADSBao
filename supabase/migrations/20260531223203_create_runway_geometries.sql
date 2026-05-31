-- Runway threshold geometry for map overlays.
--
-- OpenAIP Core runway records provide runway attributes but not threshold
-- coordinates. ADSBao keeps OpenAIP as the primary airport data source and
-- stores this narrow geometry table separately so the map can draw accurate
-- runway centerlines and end labels.

create table if not exists public.runway_geometries (
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
  on public.runway_geometries (airport_ident);

create index if not exists runway_geometries_source_airport_idx
  on public.runway_geometries (source, airport_ident);

create or replace function public.set_runway_geometries_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

revoke execute on function public.set_runway_geometries_updated_at()
  from public, anon, authenticated;

drop trigger if exists runway_geometries_set_updated_at
  on public.runway_geometries;

create trigger runway_geometries_set_updated_at
before update on public.runway_geometries
for each row
execute function public.set_runway_geometries_updated_at();

alter table public.runway_geometries enable row level security;

grant select on table public.runway_geometries to anon, authenticated;
grant select, insert, update, delete on table public.runway_geometries to service_role;

drop policy if exists "Runway geometries are readable by everyone"
  on public.runway_geometries;
create policy "Runway geometries are readable by everyone"
on public.runway_geometries
for select to anon, authenticated using (true);
