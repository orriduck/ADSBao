create or replace function public.openaip_limit_ft_msl(
  p_limit jsonb
)
returns double precision
language sql
immutable
set search_path = public, extensions
as $$
  select case
    when p_limit is null or jsonb_typeof(p_limit) <> 'object' then null::double precision
    when not (p_limit ? 'value') then null::double precision
    when (p_limit->>'unit') ~ '^-?[0-9]+$'
      and (p_limit->>'unit')::integer = 6
      then nullif(p_limit->>'value', '')::double precision * 100
    when (p_limit->>'unit') ~ '^-?[0-9]+$'
      and (p_limit->>'unit')::integer = 0
      then nullif(p_limit->>'value', '')::double precision * 3.280839895
    else nullif(p_limit->>'value', '')::double precision
  end;
$$;

create or replace function public.openaip_airspace_matches_altitude(
  p_lower_limit jsonb,
  p_upper_limit jsonb,
  p_altitude_ft_msl double precision
)
returns boolean
language sql
immutable
set search_path = public, extensions
as $$
  select
    p_altitude_ft_msl is null
    or p_altitude_ft_msl between
      coalesce(public.openaip_limit_ft_msl(p_lower_limit), -1000000)
      and coalesce(public.openaip_limit_ft_msl(p_upper_limit), 1000000);
$$;

drop function if exists public.get_openaip_airspaces_in_bbox(
  double precision,
  double precision,
  double precision,
  double precision,
  integer
);

create or replace function public.get_openaip_airspaces_in_bbox(
  p_west double precision,
  p_south double precision,
  p_east double precision,
  p_north double precision,
  p_limit integer default 100,
  p_altitude_ft_msl double precision default null
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
    and public.openaip_airspace_matches_altitude(
      a.lower_limit,
      a.upper_limit,
      p_altitude_ft_msl
    )
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
      altitude_ft_msl,
      extensions.ST_SetSRID(
        extensions.ST_MakePoint(longitude, latitude),
        4326
      ) as geom
    from jsonb_to_recordset(coalesce(p_trace_points, '[]'::jsonb))
      as point(
        latitude double precision,
        longitude double precision,
        timestamp_ms double precision,
        altitude_ft_msl double precision
      )
    where latitude between -90 and 90
      and longitude between -180 and 180
  ),
  trace_regions as (
    select distinct
      r.osm_id,
      r.name,
      r.name_en,
      r.country_code
    from public.osm_admin_level4_regions r
    join trace_points p
      on r.geom OPERATOR(extensions.&&) p.geom
      and extensions.ST_Intersects(r.geom, p.geom)
  ),
  trace_airspace_matches as (
    select distinct
      a.openaip_id,
      a.payload
    from public.openaip_airspaces a
    join trace_points p
      on a.geom OPERATOR(extensions.&&) p.geom
      and extensions.ST_Intersects(a.geom, p.geom)
      and public.openaip_airspace_matches_altitude(
        a.lower_limit,
        a.upper_limit,
        p.altitude_ft_msl
      )
    order by a.openaip_id
    limit greatest(1, least(coalesce(p_limit, 250), 500))
  ),
  trace_shape as (
    select
      count(*) as point_count,
      min(timestamp_ms) as first_timestamp_ms,
      max(timestamp_ms) as last_timestamp_ms
    from trace_points
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
          filter (
            where m.airspace_id is not null
              and exists (
                select 1
                from trace_airspace_matches matched
                where matched.openaip_id = m.airspace_id
              )
          ),
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
        from trace_airspace_matches
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
            'airspaceIds', airspace_ids,
            'matchedAirspaceCount', jsonb_array_length(airspace_ids)
          )
          order by name, osm_id
        )
        from region_stats
      ),
      '[]'::jsonb
    )
  );
$$;

grant execute on function public.openaip_limit_ft_msl(jsonb)
  to anon, authenticated, service_role;

grant execute on function public.openaip_airspace_matches_altitude(
  jsonb,
  jsonb,
  double precision
) to anon, authenticated, service_role;

grant execute on function public.get_openaip_airspaces_in_bbox(
  double precision,
  double precision,
  double precision,
  double precision,
  integer,
  double precision
) to anon, authenticated, service_role;

grant execute on function public.get_full_trace_airspace_stats(jsonb, integer)
  to anon, authenticated, service_role;

comment on function public.openaip_limit_ft_msl(jsonb) is
  'Converts OpenAIP vertical limits to feet for altitude-aware filtering; FL values become hundreds of feet.';

comment on function public.openaip_airspace_matches_altitude(jsonb, jsonb, double precision) is
  'Returns true when an aircraft altitude in feet MSL is within an OpenAIP airspace vertical range. Null altitude keeps the airspace visible.';

comment on function public.get_openaip_airspaces_in_bbox(
  double precision,
  double precision,
  double precision,
  double precision,
  integer,
  double precision
) is
  'Returns OpenAIP airspace payloads intersecting a map tile bbox and optional aircraft altitude.';
