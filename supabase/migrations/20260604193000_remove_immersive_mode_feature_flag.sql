update public.user_feature_flags
set flags = flags - 'immersiveModeEnabled'
where flags ? 'immersiveModeEnabled';

comment on table public.user_feature_flags is
  'Server-read feature flags keyed by Clerk primary email and environment. Example flags: {"flightAwareEnabled": true}.';
