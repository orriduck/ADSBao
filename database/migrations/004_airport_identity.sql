-- Canonical airport identity layer.
--
-- Source tables keep their upstream identifiers, while ADSBao reads resolve
-- ICAO/IATA/source aliases through aviation.airport_aliases first.

create schema if not exists aviation;

create table if not exists aviation.airports (
  ident text primary key,
  icao_code text not null default '',
  iata_code text not null default '',
  ourairports_ident text not null default '',
  openaip_id text not null default '',
  name text not null default '',
  municipality text not null default '',
  iso_country text not null default '',
  latitude_deg double precision,
  longitude_deg double precision,
  source text not null default '',
  refreshed_at timestamptz not null default timezone('utc', now()),
  constraint aviation_airports_ident_format
    check (ident ~ '^[A-Z0-9]{2,32}$'),
  constraint aviation_airports_icao_format
    check (icao_code = '' or icao_code ~ '^[A-Z0-9]{3,4}$'),
  constraint aviation_airports_iata_format
    check (iata_code = '' or iata_code ~ '^[A-Z0-9]{3}$'),
  constraint aviation_airports_latitude_range
    check (latitude_deg is null or latitude_deg between -90 and 90),
  constraint aviation_airports_longitude_range
    check (longitude_deg is null or longitude_deg between -180 and 180)
);

create index if not exists aviation_airports_icao_code_idx
  on aviation.airports (icao_code)
  where icao_code <> '';

create index if not exists aviation_airports_iata_code_idx
  on aviation.airports (iata_code)
  where iata_code <> '';

create index if not exists aviation_airports_ourairports_ident_idx
  on aviation.airports (ourairports_ident)
  where ourairports_ident <> '';

create table if not exists aviation.airport_aliases (
  alias_ident text primary key,
  airport_ident text not null references aviation.airports (ident) on delete cascade,
  alias_type text not null,
  source text not null,
  source_id text not null default '',
  priority integer not null,
  refreshed_at timestamptz not null default timezone('utc', now()),
  constraint aviation_airport_aliases_alias_format
    check (alias_ident ~ '^[A-Z0-9]{2,64}$'),
  constraint aviation_airport_aliases_type_check
    check (alias_type in ('canonical', 'icao', 'iata', 'ourairports_ident', 'openaip_id', 'alt_identifier'))
);

create index if not exists aviation_airport_aliases_airport_ident_idx
  on aviation.airport_aliases (airport_ident);

create or replace function aviation.clean_airport_ident(value text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(coalesce(btrim(value), ''), '[^A-Za-z0-9]', '', 'g'));
$$;

create or replace function aviation.refresh_airport_identity_cache()
returns void
language plpgsql
as $$
begin
  delete from aviation.airport_aliases;

  insert into aviation.airports (
    ident,
    icao_code,
    iata_code,
    ourairports_ident,
    openaip_id,
    name,
    municipality,
    iso_country,
    latitude_deg,
    longitude_deg,
    source,
    refreshed_at
  )
  select distinct on (canonical_ident)
    canonical_ident,
    icao_code,
    iata_code,
    ourairports_ident,
    '',
    name,
    municipality,
    iso_country,
    latitude_deg,
    longitude_deg,
    'ourairports',
    timezone('utc', now())
  from (
    select
      coalesce(
        nullif(aviation.clean_airport_ident(icao_code), ''),
        nullif(aviation.clean_airport_ident(ident), ''),
        nullif(aviation.clean_airport_ident(iata_code), '')
      ) as canonical_ident,
      aviation.clean_airport_ident(icao_code) as icao_code,
      aviation.clean_airport_ident(iata_code) as iata_code,
      aviation.clean_airport_ident(ident) as ourairports_ident,
      name,
      municipality,
      iso_country,
      latitude_deg,
      longitude_deg
    from ourairports.airports
  ) candidates
  where canonical_ident <> ''
  order by
    canonical_ident,
    (icao_code <> '') desc,
    (name <> '') desc,
    ourairports_ident asc
  on conflict (ident) do update set
    icao_code = excluded.icao_code,
    iata_code = case
      when excluded.iata_code <> '' then excluded.iata_code
      else aviation.airports.iata_code
    end,
    ourairports_ident = excluded.ourairports_ident,
    openaip_id = aviation.airports.openaip_id,
    name = excluded.name,
    municipality = excluded.municipality,
    iso_country = excluded.iso_country,
    latitude_deg = excluded.latitude_deg,
    longitude_deg = excluded.longitude_deg,
    source = excluded.source,
    refreshed_at = excluded.refreshed_at;

  insert into aviation.airports (
    ident,
    icao_code,
    iata_code,
    ourairports_ident,
    openaip_id,
    name,
    municipality,
    iso_country,
    latitude_deg,
    longitude_deg,
    source,
    refreshed_at
  )
  select distinct on (canonical_ident)
    canonical_ident,
    icao_code,
    iata_code,
    '',
    openaip_id,
    name,
    '',
    country,
    latitude_deg,
    longitude_deg,
    'openaip',
    timezone('utc', now())
  from (
    select
      coalesce(
        nullif(aviation.clean_airport_ident(icao_code), ''),
        nullif(aviation.clean_airport_ident(alt_identifier), ''),
        nullif(aviation.clean_airport_ident(iata_code), ''),
        nullif(aviation.clean_airport_ident(openaip_id), '')
      ) as canonical_ident,
      aviation.clean_airport_ident(icao_code) as icao_code,
      aviation.clean_airport_ident(iata_code) as iata_code,
      aviation.clean_airport_ident(openaip_id) as openaip_id,
      name,
      country,
      latitude_deg,
      longitude_deg
    from openaip.openaip_airports
  ) candidates
  where canonical_ident <> ''
  order by
    canonical_ident,
    (icao_code <> '') desc,
    (name <> '') desc,
    openaip_id asc
  on conflict (ident) do update set
    openaip_id = case
      when aviation.airports.openaip_id = '' then excluded.openaip_id
      else aviation.airports.openaip_id
    end,
    iata_code = case
      when aviation.airports.iata_code = '' then excluded.iata_code
      else aviation.airports.iata_code
    end,
    name = case
      when aviation.airports.name = '' then excluded.name
      else aviation.airports.name
    end,
    municipality = case
      when aviation.airports.municipality = '' then excluded.municipality
      else aviation.airports.municipality
    end,
    iso_country = case
      when aviation.airports.iso_country = '' then excluded.iso_country
      else aviation.airports.iso_country
    end,
    latitude_deg = coalesce(aviation.airports.latitude_deg, excluded.latitude_deg),
    longitude_deg = coalesce(aviation.airports.longitude_deg, excluded.longitude_deg),
    refreshed_at = excluded.refreshed_at;

  insert into aviation.airport_aliases (
    alias_ident,
    airport_ident,
    alias_type,
    source,
    source_id,
    priority,
    refreshed_at
  )
  with candidates as (
    select
      ident as alias_ident,
      ident as airport_ident,
      'canonical'::text as alias_type,
      source,
      coalesce(nullif(ourairports_ident, ''), nullif(openaip_id, ''), ident) as source_id,
      0 as priority
    from aviation.airports
    union all
    select
      icao_code as alias_ident,
      ident as airport_ident,
      'icao',
      source,
      coalesce(nullif(ourairports_ident, ''), nullif(openaip_id, ''), ident),
      10
    from aviation.airports
    where icao_code <> ''
    union all
    select
      ourairports_ident as alias_ident,
      ident as airport_ident,
      'ourairports_ident',
      'ourairports',
      ourairports_ident,
      20
    from aviation.airports
    where ourairports_ident <> ''
    union all
    select
      iata_code as alias_ident,
      ident as airport_ident,
      'iata',
      source,
      coalesce(nullif(ourairports_ident, ''), nullif(openaip_id, ''), ident),
      30
    from aviation.airports
    where iata_code <> ''
    union all
    select
      openaip.alt_identifier as alias_ident,
      airports.ident as airport_ident,
      'alt_identifier',
      'openaip',
      openaip.openaip_id,
      35
    from (
      select
        aviation.clean_airport_ident(alt_identifier) as alt_identifier,
        aviation.clean_airport_ident(openaip_id) as openaip_id,
        coalesce(
          nullif(aviation.clean_airport_ident(icao_code), ''),
          nullif(aviation.clean_airport_ident(alt_identifier), ''),
          nullif(aviation.clean_airport_ident(iata_code), ''),
          nullif(aviation.clean_airport_ident(openaip_id), '')
        ) as canonical_ident
      from openaip.openaip_airports
    ) openaip
    join aviation.airports airports
      on airports.ident = openaip.canonical_ident
    where openaip.alt_identifier <> ''
    union all
    select
      openaip_id as alias_ident,
      ident as airport_ident,
      'openaip_id',
      'openaip',
      openaip_id,
      40
    from aviation.airports
    where openaip_id <> ''
  )
  select distinct on (alias_ident)
    alias_ident,
    airport_ident,
    alias_type,
    source,
    source_id,
    priority,
    timezone('utc', now())
  from candidates
  where alias_ident <> ''
  order by alias_ident, priority asc, airport_ident asc;
end;
$$;

select aviation.refresh_airport_identity_cache();
