create table if not exists public.nearby_airport_cache (
  cache_key text primary key,
  query jsonb not null,
  response jsonb not null,
  expires_at timestamptz not null,
  inserted_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists nearby_airport_cache_expires_at_idx
  on public.nearby_airport_cache (expires_at);

alter table public.nearby_airport_cache enable row level security;

grant select, insert, update, delete on table public.nearby_airport_cache to service_role;
grant select, insert, update on table public.nearby_airport_cache to anon;

drop policy if exists "Nearby airport cache entries are readable"
  on public.nearby_airport_cache;

create policy "Nearby airport cache entries are readable"
on public.nearby_airport_cache
for select
to anon
using (cache_key like 'nearby-airports:%');

drop policy if exists "Nearby airport cache entries can be inserted"
  on public.nearby_airport_cache;

create policy "Nearby airport cache entries can be inserted"
on public.nearby_airport_cache
for insert
to anon
with check (
  cache_key like 'nearby-airports:%'
  and jsonb_typeof(query) = 'object'
  and jsonb_typeof(response) = 'object'
  and expires_at > timezone('utc', now())
  and expires_at <= timezone('utc', now()) + interval '90 days' + interval '5 minutes'
);

drop policy if exists "Nearby airport cache entries can be updated"
  on public.nearby_airport_cache;

create policy "Nearby airport cache entries can be updated"
on public.nearby_airport_cache
for update
to anon
using (cache_key like 'nearby-airports:%')
with check (
  cache_key like 'nearby-airports:%'
  and jsonb_typeof(query) = 'object'
  and jsonb_typeof(response) = 'object'
  and expires_at > timezone('utc', now())
  and expires_at <= timezone('utc', now()) + interval '90 days' + interval '5 minutes'
);

create or replace function public.set_nearby_airport_cache_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

revoke execute on function public.set_nearby_airport_cache_updated_at()
  from public, anon, authenticated;

drop trigger if exists nearby_airport_cache_set_updated_at
  on public.nearby_airport_cache;

create trigger nearby_airport_cache_set_updated_at
before update on public.nearby_airport_cache
for each row
execute function public.set_nearby_airport_cache_updated_at();
