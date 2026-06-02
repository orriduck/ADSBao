-- Per-user map settings controlled from the Map Settings sheet. Clerk remains
-- the login source; the app reads the signed-in user's primary email, then
-- persists this shared settings model from a server route using service_role.
create table if not exists public.user_map_settings (
  email text not null,
  environment text not null default 'production',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint user_map_settings_pkey primary key (email, environment),
  constraint user_map_settings_email_normalized check (
    email = lower(btrim(email))
    and email <> ''
    and position('@' in email) > 1
  ),
  constraint user_map_settings_environment_check
    check (environment in ('local', 'preview', 'production')),
  constraint user_map_settings_settings_object
    check (jsonb_typeof(settings) = 'object')
);

comment on table public.user_map_settings is
  'Server-managed map mode and layer settings keyed by Clerk primary email and environment.';

comment on column public.user_map_settings.settings is
  'Normalized map settings JSON: selectedMode, baseMode, layerOverrides, audioEnabled, updatedAt.';

alter table public.user_map_settings enable row level security;

-- This table is intentionally server-only for the app. Do not grant anon or
-- authenticated access; Next.js route handlers read/write it with a server key.
grant select, insert, update, delete
  on table public.user_map_settings to service_role;
