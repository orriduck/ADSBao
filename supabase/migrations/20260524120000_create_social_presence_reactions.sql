create table if not exists public.social_presence (
  id uuid primary key default gen_random_uuid(),
  session_hash text not null,
  entity_type text not null check (entity_type in ('airport', 'aircraft')),
  entity_key text not null,
  context_airport_icao text not null default '',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (session_hash, entity_type, entity_key, context_airport_icao)
);

create index if not exists social_presence_live_idx
  on public.social_presence (
    entity_type,
    entity_key,
    context_airport_icao,
    last_seen_at desc
  )
  where deleted_at is null;

alter table public.social_presence enable row level security;

create table if not exists public.social_reactions (
  id uuid primary key default gen_random_uuid(),
  session_hash text not null,
  entity_type text not null check (entity_type in ('airport', 'aircraft')),
  entity_key text not null,
  context_airport_icao text not null default '',
  reaction text not null check (
    reaction in ('fire', 'walk', 'like', 'ticket', 'camera')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (
    session_hash,
    entity_type,
    entity_key,
    context_airport_icao,
    reaction
  )
);

create index if not exists social_reactions_entity_idx
  on public.social_reactions (
    entity_type,
    entity_key,
    context_airport_icao,
    reaction
  )
  where deleted_at is null;

alter table public.social_reactions enable row level security;

revoke all on table public.social_presence from anon, authenticated;
revoke all on table public.social_reactions from anon, authenticated;
