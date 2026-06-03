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
    extensions.ST_Multi(
      extensions.ST_CollectionExtract(
        extensions.ST_MakeValid(
          extensions.ST_SimplifyPreserveTopology(geom, 0.005)
        ),
        3
      )
    )::extensions.geometry(MultiPolygon, 4326),
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
    extensions.ST_Multi(
      extensions.ST_CollectionExtract(
        extensions.ST_MakeValid(
          extensions.ST_SimplifyPreserveTopology(geom, 0.002)
        ),
        3
      )
    )::extensions.geometry(Geometry, 4326),
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
