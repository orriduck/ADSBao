-- SpotterGuide locations keyed by ADSBao canonical airport identity.
--
-- The source still exposes ICAO-like names in URLs, but app reads should join
-- through aviation.airport_aliases and store the resolved aviation.airports.ident.

alter table spotter.spotter_locations
  add column if not exists airport_ident text not null default '',
  add column if not exists spot_number integer,
  add column if not exists source text not null default 'spotterguide',
  add column if not exists source_key text not null default '',
  add column if not exists source_page_title text not null default '',
  add column if not exists source_map_url text not null default '',
  add column if not exists source_modified_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'spotter'
      and table_name = 'spotter_locations'
      and column_name = 'airport_icao'
  ) then
    update spotter.spotter_locations spotter_locations
    set airport_ident = aliases.airport_ident
    from aviation.airport_aliases aliases
    where spotter_locations.airport_ident = ''
      and aliases.alias_ident = aviation.clean_airport_ident(spotter_locations.airport_icao);

    update spotter.spotter_locations
    set airport_ident = aviation.clean_airport_ident(airport_icao)
    where airport_ident = ''
      and aviation.clean_airport_ident(airport_icao) <> '';
  end if;
end $$;

update spotter.spotter_locations
set source = 'spotterguide'
where source = '';

update spotter.spotter_locations
set source_key = lower(concat_ws(
  ':',
  source,
  airport_ident,
  nullif(spot_number::text, ''),
  to_char(latitude_deg, 'FM999999990.000000'),
  to_char(longitude_deg, 'FM999999990.000000')
))
where source_key = ''
  and airport_ident <> '';

delete from spotter.spotter_locations spotter_locations
where spotter_locations.airport_ident = ''
  or spotter_locations.source_key = ''
  or not exists (
    select 1
    from aviation.airports airports
    where airports.ident = spotter_locations.airport_ident
  );

delete from spotter.spotter_locations spotter_locations
using (
  select ctid
  from (
    select
      ctid,
      row_number() over (
        partition by source_key
        order by updated_at desc, inserted_at desc, id::text asc
      ) as duplicate_rank
    from spotter.spotter_locations
    where source_key <> ''
  ) ranked
  where duplicate_rank > 1
) duplicates
where spotter_locations.ctid = duplicates.ctid;

alter table spotter.spotter_locations
  drop constraint if exists spotter_locations_icao_format,
  drop constraint if exists spotter_locations_airport_ident_format,
  drop constraint if exists spotter_locations_spot_number_positive,
  drop constraint if exists spotter_locations_source_key_present,
  add constraint spotter_locations_airport_ident_format
    check (airport_ident ~ '^[A-Z0-9]{2,32}$'),
  add constraint spotter_locations_spot_number_positive
    check (spot_number is null or spot_number > 0),
  add constraint spotter_locations_source_key_present
    check (source_key <> '');

alter table spotter.spotter_locations
  drop constraint if exists spotter_locations_airport_ident_fk,
  add constraint spotter_locations_airport_ident_fk
    foreign key (airport_ident)
    references aviation.airports (ident)
    on delete cascade;

alter table spotter.spotter_locations
  drop column if exists airport_icao,
  drop column if exists airport_name;

drop index if exists spotter.spotter_locations_airport_icao_idx;

create unique index if not exists spotter_locations_source_key_idx
  on spotter.spotter_locations (source_key);

create index if not exists spotter_locations_airport_ident_idx
  on spotter.spotter_locations (airport_ident);

create index if not exists spotter_locations_airport_spot_number_idx
  on spotter.spotter_locations (airport_ident, spot_number);
