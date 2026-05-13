-- Singleton meta row used by the stale-while-revalidate refresh in the
-- Next.js routes: tracks the last successful OurAirports import per table,
-- and acts as a soft lock so concurrent staleness triggers don't fan out
-- into N parallel imports of the same data.
--
-- Per-table timestamps let the SWR scheduler split a refresh across multiple
-- function invocations (one table per call) so each invocation finishes
-- comfortably inside Vercel's per-function timeout.

create table if not exists public.ourairports_refresh_meta (
  id text primary key default 'singleton'
    check (id = 'singleton'),
  last_imported_at timestamptz,
  airports_imported_at timestamptz,
  runways_imported_at timestamptz,
  frequencies_imported_at timestamptz,
  navaids_imported_at timestamptz,
  last_attempted_at timestamptz,
  last_status text not null default '',
  last_error text not null default '',
  airports_count integer not null default 0,
  runways_count integer not null default 0,
  frequencies_count integer not null default 0,
  navaids_count integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.ourairports_refresh_meta (id)
values ('singleton')
on conflict (id) do nothing;

alter table public.ourairports_refresh_meta enable row level security;

grant select on table public.ourairports_refresh_meta to anon, authenticated;
grant select, insert, update on table public.ourairports_refresh_meta to service_role;

drop policy if exists "Refresh meta is readable"
  on public.ourairports_refresh_meta;
create policy "Refresh meta is readable"
on public.ourairports_refresh_meta
for select to anon, authenticated using (true);
