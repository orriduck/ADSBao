-- Runtime DB access for level 4 airspace context. The app reads airspace
-- tiles and full-trace context from Supabase instead of calling OpenAIP at
-- render time. Import RPCs are service-role-only helpers for repeatable seed
-- loads into the PostGIS tables created by the prior migration.

create or replace view public.v_level4_airspace_memberships
with (security_invoker = true)
as
select
  r.osm_id,
  r.osm_type,
  r.admin_level,
  r.name as region_name,
  r.name_en as region_name_en,
  r.country_code,
  a.openaip_id as airspace_id,
  a.name as airspace_name,
  a.type as airspace_type,
  a.icao_class,
  a.country as airspace_country,
  a.lower_limit,
  a.upper_limit,
  a.active_from,
  a.active_until,
  a.payload as airspace_payload,
  extensions.ST_AsGeoJSON(coalesce(a.geom_simplified, a.geom))::jsonb
    as airspace_geometry,
  extensions.ST_Covers(r.geom, a.geom) as fully_contained,
  a.updated_at
from public.osm_admin_level4_regions r
join public.openaip_airspaces a
  on r.geom OPERATOR(extensions.&&) a.geom
  and extensions.ST_Intersects(r.geom, a.geom);

create or replace function public.get_openaip_airspaces_in_bbox(
  p_west double precision,
  p_south double precision,
  p_east double precision,
  p_north double precision,
  p_limit integer default 100
)
returns table (
  openaip_id text,
  payload jsonb
)
language sql
stable
set search_path = public, extensions
as $$
  with query_bbox as (
    select extensions.ST_MakeEnvelope(
      least(p_west, p_east),
      least(p_south, p_north),
      greatest(p_west, p_east),
      greatest(p_south, p_north),
      4326
    ) as geom
  )
  select a.openaip_id, a.payload
  from public.openaip_airspaces a
  cross join query_bbox b
  where a.geom OPERATOR(extensions.&&) b.geom
    and extensions.ST_Intersects(a.geom, b.geom)
  order by a.name, a.openaip_id
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

create or replace function public.get_full_trace_airspace_stats(
  p_trace_points jsonb,
  p_limit integer default 250
)
returns jsonb
language sql
stable
set search_path = public, extensions
as $$
  with trace_points as (
    select
      row_number() over () as point_order,
      latitude,
      longitude,
      timestamp_ms,
      extensions.ST_SetSRID(
        extensions.ST_MakePoint(longitude, latitude),
        4326
      ) as geom
    from jsonb_to_recordset(coalesce(p_trace_points, '[]'::jsonb))
      as point(
        latitude double precision,
        longitude double precision,
        timestamp_ms double precision
      )
    where latitude between -90 and 90
      and longitude between -180 and 180
  ),
  trace_shape as (
    select
      count(*) as point_count,
      case
        when count(*) = 0 then null::extensions.geometry
        when count(*) = 1 then (array_agg(geom order by point_order))[1]
        else extensions.ST_MakeLine(geom order by point_order)
      end as geom,
      min(timestamp_ms) as first_timestamp_ms,
      max(timestamp_ms) as last_timestamp_ms
    from trace_points
  ),
  trace_regions as (
    select distinct
      r.osm_id,
      r.name,
      r.name_en,
      r.country_code
    from public.osm_admin_level4_regions r
    join trace_shape s
      on s.geom is not null
      and r.geom OPERATOR(extensions.&&) s.geom
      and extensions.ST_Intersects(r.geom, s.geom)
  ),
  trace_airspaces as (
    select distinct
      a.openaip_id,
      a.payload
    from public.openaip_airspaces a
    join trace_shape s
      on s.geom is not null
      and a.geom OPERATOR(extensions.&&) s.geom
      and extensions.ST_Intersects(a.geom, s.geom)
    order by a.openaip_id
    limit greatest(1, least(coalesce(p_limit, 250), 500))
  ),
  region_stats as (
    select
      v.osm_id,
      v.name,
      v.name_en,
      v.country_code,
      v.navaid_count,
      v.airspace_count,
      coalesce(
        jsonb_agg(m.airspace_id order by m.airspace_name, m.airspace_id)
          filter (where m.airspace_id is not null),
        '[]'::jsonb
      ) as airspace_ids
    from public.v_level4_airspace_navaids v
    join trace_regions r
      on r.osm_id = v.osm_id
    left join public.v_level4_airspace_memberships m
      on m.osm_id = v.osm_id
    group by
      v.osm_id,
      v.name,
      v.name_en,
      v.country_code,
      v.navaid_count,
      v.airspace_count
  )
  select jsonb_build_object(
    'tracePointCount', coalesce((select point_count from trace_shape), 0),
    'firstTimestampMs', (select first_timestamp_ms from trace_shape),
    'lastTimestampMs', (select last_timestamp_ms from trace_shape),
    'airspaceIds', coalesce(
      (
        select jsonb_agg(openaip_id order by openaip_id)
        from trace_airspaces
      ),
      '[]'::jsonb
    ),
    'regions', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'osmId', osm_id,
            'name', name,
            'nameEn', name_en,
            'countryCode', country_code,
            'navaidCount', navaid_count,
            'airspaceCount', airspace_count,
            'airspaceIds', airspace_ids
          )
          order by name, osm_id
        )
        from region_stats
      ),
      '[]'::jsonb
    )
  );
$$;

create or replace function public.upsert_osm_admin_level4_region_geojson(
  p_osm_id bigint,
  p_osm_type text,
  p_name text,
  p_name_en text,
  p_country_code text,
  p_parent_osm_id bigint,
  p_tags jsonb,
  p_geojson jsonb
)
returns void
language sql
set search_path = public, extensions
as $$
  insert into public.osm_admin_level4_regions (
    osm_id,
    osm_type,
    name,
    name_en,
    country_code,
    parent_osm_id,
    tags,
    geom,
    geom_simplified,
    updated_at
  )
  select
    p_osm_id,
    coalesce(nullif(p_osm_type, ''), 'relation'),
    coalesce(p_name, ''),
    coalesce(p_name_en, p_name, ''),
    upper(coalesce(p_country_code, '')),
    p_parent_osm_id,
    coalesce(p_tags, '{}'::jsonb),
    geom,
    extensions.ST_SimplifyPreserveTopology(geom, 0.005)::extensions.geometry(MultiPolygon, 4326),
    timezone('utc', now())
  from (
    select extensions.ST_Multi(
      extensions.ST_CollectionExtract(
        extensions.ST_MakeValid(
          extensions.ST_SetSRID(
            extensions.ST_GeomFromGeoJSON(p_geojson::text),
            4326
          )
        ),
        3
      )
    )::extensions.geometry(MultiPolygon, 4326) as geom
  ) source
  on conflict (osm_id) do update
    set
      osm_type = excluded.osm_type,
      name = excluded.name,
      name_en = excluded.name_en,
      country_code = excluded.country_code,
      parent_osm_id = excluded.parent_osm_id,
      tags = excluded.tags,
      geom = excluded.geom,
      geom_simplified = excluded.geom_simplified,
      updated_at = excluded.updated_at;
$$;

create or replace function public.upsert_openaip_airspace_geojson(
  p_payload jsonb
)
returns void
language sql
set search_path = public, extensions
as $$
  insert into public.openaip_airspaces (
    openaip_id,
    name,
    type,
    icao_class,
    country,
    lower_limit,
    upper_limit,
    active_from,
    active_until,
    geom,
    geom_simplified,
    payload,
    updated_at_upstream,
    updated_at
  )
  select
    p_payload->>'_id',
    coalesce(p_payload->>'name', ''),
    case
      when p_payload->>'type' ~ '^-?[0-9]+$'
        then (p_payload->>'type')::integer
      else null
    end,
    coalesce(p_payload->>'icaoClass', ''),
    upper(coalesce(p_payload->>'country', '')),
    p_payload->'lowerLimit',
    p_payload->'upperLimit',
    nullif(p_payload->>'activeFrom', '')::timestamptz,
    nullif(p_payload->>'activeUntil', '')::timestamptz,
    geom,
    extensions.ST_SimplifyPreserveTopology(geom, 0.002)::extensions.geometry(Geometry, 4326),
    p_payload,
    nullif(coalesce(p_payload->>'updatedAt', p_payload->>'updated_at'), '')::timestamptz,
    timezone('utc', now())
  from (
    select extensions.ST_Multi(
      extensions.ST_CollectionExtract(
        extensions.ST_MakeValid(
          extensions.ST_SetSRID(
            extensions.ST_GeomFromGeoJSON((p_payload->'geometry')::text),
            4326
          )
        ),
        3
      )
    )::extensions.geometry(Geometry, 4326) as geom
  ) source
  where coalesce(p_payload->>'_id', '') <> ''
    and p_payload ? 'geometry'
  on conflict (openaip_id) do update
    set
      name = excluded.name,
      type = excluded.type,
      icao_class = excluded.icao_class,
      country = excluded.country,
      lower_limit = excluded.lower_limit,
      upper_limit = excluded.upper_limit,
      active_from = excluded.active_from,
      active_until = excluded.active_until,
      geom = excluded.geom,
      geom_simplified = excluded.geom_simplified,
      payload = excluded.payload,
      updated_at_upstream = excluded.updated_at_upstream,
      updated_at = excluded.updated_at;
$$;

grant select on table public.v_level4_airspace_memberships
  to anon, authenticated, service_role;

grant execute on function public.get_openaip_airspaces_in_bbox(
  double precision,
  double precision,
  double precision,
  double precision,
  integer
) to anon, authenticated, service_role;

grant execute on function public.get_full_trace_airspace_stats(jsonb, integer)
  to anon, authenticated, service_role;

revoke all on function public.upsert_osm_admin_level4_region_geojson(
  bigint,
  text,
  text,
  text,
  text,
  bigint,
  jsonb,
  jsonb
) from public, anon, authenticated;

revoke all on function public.upsert_openaip_airspace_geojson(jsonb)
  from public, anon, authenticated;

grant execute on function public.upsert_osm_admin_level4_region_geojson(
  bigint,
  text,
  text,
  text,
  text,
  bigint,
  jsonb,
  jsonb
) to service_role;

grant execute on function public.upsert_openaip_airspace_geojson(jsonb)
  to service_role;

drop trigger if exists openaip_cache_set_updated_at on public.openaip_cache;
drop function if exists public.set_openaip_cache_updated_at();
drop table if exists public.openaip_cache cascade;
drop table if exists public.openaip_airports cascade;

comment on view public.v_level4_airspace_memberships is
  'One row per OSM admin_level=4 region and intersecting OpenAIP airspace. Airspaces may belong to multiple regions.';

comment on function public.get_openaip_airspaces_in_bbox(
  double precision,
  double precision,
  double precision,
  double precision,
  integer
) is
  'Returns OpenAIP airspace payloads intersecting a map tile bbox from PostGIS.';

comment on function public.get_full_trace_airspace_stats(jsonb, integer) is
  'Returns DB-backed region statistics and intersecting airspace IDs for a full aircraft trace.';
