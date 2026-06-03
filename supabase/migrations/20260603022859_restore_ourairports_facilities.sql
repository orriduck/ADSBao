-- Restore narrow OurAirports static facilities used to augment OpenAIP airport
-- detail pages. OpenAIP remains the primary airport directory; these tables
-- only provide extra ATC frequency and nearby navaid coverage.

create table if not exists public.airport_frequencies (
  id bigint primary key,
  airport_ref bigint,
  airport_ident text not null,
  type text not null default '',
  description text not null default '',
  frequency_mhz double precision,
  imported_at timestamptz not null default timezone('utc', now()),
  constraint airport_frequencies_airport_ident_format
    check (airport_ident ~ '^[A-Z0-9]{2,8}$'),
  constraint airport_frequencies_frequency_positive
    check (frequency_mhz is null or frequency_mhz > 0)
);

create index if not exists airport_frequencies_airport_ident_idx
  on public.airport_frequencies (airport_ident);

create table if not exists public.navaids (
  id bigint primary key,
  filename text not null default '',
  ident text not null default '',
  name text not null default '',
  type text not null default '',
  frequency_khz double precision,
  latitude_deg double precision,
  longitude_deg double precision,
  elevation_ft double precision,
  iso_country text not null default '',
  dme_frequency_khz double precision,
  dme_channel text not null default '',
  dme_latitude_deg double precision,
  dme_longitude_deg double precision,
  dme_elevation_ft double precision,
  slaved_variation_deg double precision,
  magnetic_variation_deg double precision,
  usage_type text not null default '',
  power text not null default '',
  associated_airport text not null default '',
  imported_at timestamptz not null default timezone('utc', now()),
  constraint navaids_latitude_range check (
    latitude_deg is null or latitude_deg between -90 and 90
  ),
  constraint navaids_longitude_range check (
    longitude_deg is null or longitude_deg between -180 and 180
  ),
  constraint navaids_dme_latitude_range check (
    dme_latitude_deg is null or dme_latitude_deg between -90 and 90
  ),
  constraint navaids_dme_longitude_range check (
    dme_longitude_deg is null or dme_longitude_deg between -180 and 180
  )
);

create index if not exists navaids_associated_airport_idx
  on public.navaids (associated_airport)
  where associated_airport <> '';

create index if not exists navaids_lat_lon_idx
  on public.navaids (latitude_deg, longitude_deg);

alter table public.airport_frequencies enable row level security;
alter table public.navaids enable row level security;

grant select on table public.airport_frequencies to anon, authenticated;
grant select on table public.navaids to anon, authenticated;

grant select, insert, update, delete on table public.airport_frequencies
  to service_role;
grant select, insert, update, delete on table public.navaids
  to service_role;

drop policy if exists "Airport frequencies are readable by everyone"
  on public.airport_frequencies;
create policy "Airport frequencies are readable by everyone"
on public.airport_frequencies
for select to anon, authenticated using (true);

drop policy if exists "Navaids are readable by everyone" on public.navaids;
create policy "Navaids are readable by everyone"
on public.navaids
for select to anon, authenticated using (true);
