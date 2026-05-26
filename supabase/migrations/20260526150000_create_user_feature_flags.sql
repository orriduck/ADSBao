-- Per-user feature flags controlled from Supabase. Clerk remains the login
-- source; the app reads the signed-in user's primary email, then resolves
-- feature flags from this table on the server.
create table if not exists public.user_feature_flags (
  email text primary key,
  flags jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint user_feature_flags_email_normalized check (
    email = lower(btrim(email))
    and email <> ''
    and position('@' in email) > 1
  ),
  constraint user_feature_flags_flags_object check (
    jsonb_typeof(flags) = 'object'
  )
);

comment on table public.user_feature_flags is
  'Server-read feature flags keyed by Clerk primary email. Example flags: {"flightAwareEnabled": true}.';

alter table public.user_feature_flags enable row level security;

-- This table is intentionally server-only for the app. Do not grant anon or
-- authenticated access; Next.js route handlers read it with a server secret.
grant select, insert, update, delete
  on table public.user_feature_flags to service_role;
