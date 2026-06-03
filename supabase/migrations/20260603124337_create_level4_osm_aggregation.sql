-- Level 4 OSM administrative regions as spatial index primitives for aviation
-- reference data. OSM regions are not aviation entities; they only provide
-- reusable region keys for cached airspace/navaid payloads.

create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

create table if not exists public.osm_admin_level4_regions (
  osm_id bigint primary key,
  osm_type text not null default 'relation',
  admin_level integer not null default 4,
  name text not null default '',
  name_en text not null default '',
  country_code text not null default '',
  parent_osm_id bigint,
  tags jsonb not null default '{}'::jsonb,
  geom extensions.geometry(MultiPolygon, 4326) not null,
  geom_simplified extensions.geometry(MultiPolygon, 4326),
  bbox extensions.geometry(Polygon, 4326)
    generated always as (
      extensions.ST_Envelope(geom)::extensions.geometry(Polygon, 4326)
    ) stored,
  imported_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint osm_admin_level4_regions_osm_type
    check (osm_type in ('relation', 'way')),
  constraint osm_admin_level4_regions_admin_level check (admin_level = 4),
  constraint osm_admin_level4_regions_country_code_format
    check (country_code = '' or country_code ~ '^[A-Z]{2}$'),
  constraint osm_admin_level4_regions_tags_object
    check (jsonb_typeof(tags) = 'object'),
  constraint osm_admin_level4_regions_geom_valid
    check (
      extensions.ST_SRID(geom) = 4326
      and extensions.ST_IsValid(geom)
    ),
  constraint osm_admin_level4_regions_geom_simplified_valid
    check (
      geom_simplified is null
      or (
        extensions.ST_SRID(geom_simplified) = 4326
        and extensions.ST_IsValid(geom_simplified)
      )
    )
);

create index if not exists osm_admin_level4_regions_country_idx
  on public.osm_admin_level4_regions (country_code);

create index if not exists osm_admin_level4_regions_name_idx
  on public.osm_admin_level4_regions (lower(name));

create index if not exists osm_admin_level4_regions_geom_gix
  on public.osm_admin_level4_regions using gist (geom);

create index if not exists osm_admin_level4_regions_geom_simplified_gix
  on public.osm_admin_level4_regions using gist (geom_simplified)
  where geom_simplified is not null;

create table if not exists public.openaip_airspaces (
  openaip_id text primary key,
  name text not null default '',
  type integer,
  icao_class text not null default '',
  country text not null default '',
  lower_limit jsonb,
  upper_limit jsonb,
  active_from timestamptz,
  active_until timestamptz,
  geom extensions.geometry(Geometry, 4326) not null,
  geom_simplified extensions.geometry(Geometry, 4326),
  payload jsonb not null,
  updated_at_upstream timestamptz,
  imported_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint openaip_airspaces_country_format
    check (country = '' or country ~ '^[A-Z]{2}$'),
  constraint openaip_airspaces_payload_object
    check (jsonb_typeof(payload) = 'object'),
  constraint openaip_airspaces_lower_limit_object
    check (lower_limit is null or jsonb_typeof(lower_limit) = 'object'),
  constraint openaip_airspaces_upper_limit_object
    check (upper_limit is null or jsonb_typeof(upper_limit) = 'object'),
  constraint openaip_airspaces_geom_valid
    check (
      extensions.ST_SRID(geom) = 4326
      and extensions.ST_IsValid(geom)
      and extensions.ST_GeometryType(geom) in ('ST_Polygon', 'ST_MultiPolygon')
    ),
  constraint openaip_airspaces_geom_simplified_valid
    check (
      geom_simplified is null
      or (
        extensions.ST_SRID(geom_simplified) = 4326
        and extensions.ST_IsValid(geom_simplified)
        and extensions.ST_GeometryType(geom_simplified)
          in ('ST_Polygon', 'ST_MultiPolygon')
      )
    )
);

create index if not exists openaip_airspaces_country_type_idx
  on public.openaip_airspaces (country, type);

create index if not exists openaip_airspaces_name_idx
  on public.openaip_airspaces (lower(name));

create index if not exists openaip_airspaces_geom_gix
  on public.openaip_airspaces using gist (geom);

create index if not exists openaip_airspaces_geom_simplified_gix
  on public.openaip_airspaces using gist (geom_simplified)
  where geom_simplified is not null;

alter table public.navaids
  add column if not exists geom extensions.geometry(Point, 4326)
  generated always as (
    case
      when latitude_deg is null or longitude_deg is null then null
      else extensions.ST_SetSRID(
        extensions.ST_MakePoint(longitude_deg, latitude_deg),
        4326
      )
    end
  ) stored;

create index if not exists navaids_geom_gix
  on public.navaids using gist (geom)
  where geom is not null;

create or replace view public.v_level4_airspace_navaids
with (security_invoker = true)
as
with region_navaids as (
  select
    r.osm_id,
    count(n.id) as navaid_count,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', n.id,
          'ident', n.ident,
          'name', n.name,
          'type', n.type,
          'frequencyKhz', n.frequency_khz,
          'lat', n.latitude_deg,
          'lon', n.longitude_deg,
          'country', n.iso_country,
          'associatedAirport', n.associated_airport
        )
        order by n.ident, n.id
      ) filter (where n.id is not null),
      '[]'::jsonb
    ) as navaids
  from public.osm_admin_level4_regions r
  left join public.navaids n
    on n.geom is not null
    and r.geom OPERATOR(extensions.&&) n.geom
    and extensions.ST_Contains(r.geom, n.geom)
  group by r.osm_id
),
region_airspace_matches as (
  select
    r.osm_id,
    a.openaip_id,
    a.name,
    a.type,
    a.icao_class,
    a.country,
    a.lower_limit,
    a.upper_limit,
    a.active_from,
    a.active_until,
    extensions.ST_Covers(r.geom, a.geom) as fully_contained
  from public.osm_admin_level4_regions r
  left join public.openaip_airspaces a
    on r.geom OPERATOR(extensions.&&) a.geom
    and extensions.ST_Intersects(r.geom, a.geom)
),
region_airspaces as (
  select
    osm_id,
    count(openaip_id) as airspace_count,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', openaip_id,
          'name', name,
          'type', type,
          'icaoClass', icao_class,
          'country', country,
          'lowerLimit', lower_limit,
          'upperLimit', upper_limit,
          'activeFrom', active_from,
          'activeUntil', active_until,
          'fullyContained', fully_contained
        )
        order by name, openaip_id
      ) filter (where openaip_id is not null),
      '[]'::jsonb
    ) as airspaces
  from region_airspace_matches
  group by osm_id
)
select
  r.osm_id,
  r.osm_type,
  r.admin_level,
  r.name,
  r.name_en,
  r.country_code,
  r.parent_osm_id,
  r.tags,
  extensions.ST_AsGeoJSON(coalesce(r.geom_simplified, r.geom))::jsonb
    as geometry,
  extensions.ST_AsGeoJSON(r.bbox)::jsonb as bbox,
  coalesce(n.navaid_count, 0) as navaid_count,
  coalesce(n.navaids, '[]'::jsonb) as navaids,
  coalesce(a.airspace_count, 0) as airspace_count,
  coalesce(a.airspaces, '[]'::jsonb) as airspaces,
  greatest(
    r.updated_at,
    coalesce(max_airspace.updated_at, r.updated_at)
  ) as updated_at
from public.osm_admin_level4_regions r
left join region_navaids n
  on n.osm_id = r.osm_id
left join region_airspaces a
  on a.osm_id = r.osm_id
left join lateral (
  select max(updated_at) as updated_at
  from public.openaip_airspaces airspaces
  where airspaces.geom OPERATOR(extensions.&&) r.geom
    and extensions.ST_Intersects(r.geom, airspaces.geom)
) max_airspace on true;

alter table public.osm_admin_level4_regions enable row level security;
alter table public.openaip_airspaces enable row level security;

grant select on table public.osm_admin_level4_regions to anon, authenticated;
grant select on table public.openaip_airspaces to anon, authenticated;
grant select on table public.v_level4_airspace_navaids to anon, authenticated;

grant select, insert, update, delete on table public.osm_admin_level4_regions
  to service_role;
grant select, insert, update, delete on table public.openaip_airspaces
  to service_role;
grant select on table public.v_level4_airspace_navaids to service_role;

drop policy if exists "OSM level 4 regions are readable by everyone"
  on public.osm_admin_level4_regions;
create policy "OSM level 4 regions are readable by everyone"
on public.osm_admin_level4_regions
for select to anon, authenticated using (true);

drop policy if exists "OpenAIP airspaces are readable by everyone"
  on public.openaip_airspaces;
create policy "OpenAIP airspaces are readable by everyone"
on public.openaip_airspaces
for select to anon, authenticated using (true);

comment on table public.osm_admin_level4_regions is
  'OSM admin_level=4 boundaries used only as spatial index primitives.';

comment on table public.openaip_airspaces is
  'OpenAIP airspace polygons normalized for regional PostGIS aggregation.';

comment on view public.v_level4_airspace_navaids is
  'Normal security-invoker view aggregating navaids by containment and airspaces by intersection for OSM admin_level=4 regions.';
