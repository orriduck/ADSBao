-- ADSBao Postgres namespace split.
--
-- Keep one Railway Postgres database, but group tables by data ownership so
-- database clients show clear boundaries instead of one long public table list.

create schema if not exists ourairports;
create schema if not exists spotter;
create schema if not exists app_user;
create schema if not exists runtime;
create schema if not exists openaip;

alter table if exists public.airports
  set schema ourairports;

alter table if exists public.airport_frequencies
  set schema ourairports;

alter table if exists public.navaids
  set schema ourairports;

alter table if exists public.runway_geometries
  set schema ourairports;

alter table if exists public.spotter_locations
  set schema spotter;

alter table if exists public.user_map_settings
  set schema app_user;

alter table if exists public.user_feature_flags
  set schema app_user;

alter table if exists public.flight_route_feedback_reports
  set schema runtime;

alter table if exists public.openaip_cache
  set schema runtime;

alter table if exists public.openaip_airports
  set schema openaip;

do $$
begin
  if to_regprocedure('public.set_runway_geometries_updated_at()') is not null then
    alter function public.set_runway_geometries_updated_at()
      set schema ourairports;
  end if;
end $$;

do $$
begin
  if to_regprocedure('public.set_spotter_locations_updated_at()') is not null then
    alter function public.set_spotter_locations_updated_at()
      set schema spotter;
  end if;
end $$;

do $$
begin
  if to_regprocedure('public.set_openaip_cache_updated_at()') is not null then
    alter function public.set_openaip_cache_updated_at()
      set schema runtime;
  end if;
end $$;
