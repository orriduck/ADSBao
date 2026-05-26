alter table public.user_feature_flags
  add column if not exists environment text not null default 'production';

alter table public.user_feature_flags
  drop constraint if exists user_feature_flags_environment_check;

alter table public.user_feature_flags
  add constraint user_feature_flags_environment_check
  check (environment in ('local', 'preview', 'production'));

alter table public.user_feature_flags
  drop constraint if exists user_feature_flags_pkey;

alter table public.user_feature_flags
  add constraint user_feature_flags_pkey
  primary key (email, environment);

comment on column public.user_feature_flags.environment is
  'Feature flag scope. Local and preview flags are isolated from production.';

comment on table public.user_feature_flags is
  'Server-read feature flags keyed by Clerk primary email and environment. Example flags: {"flightAwareEnabled": true}.';
