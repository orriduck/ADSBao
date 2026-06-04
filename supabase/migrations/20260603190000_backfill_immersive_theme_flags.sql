update public.user_feature_flags
set
  flags = jsonb_set(
    coalesce(flags, '{}'::jsonb),
    '{immersiveThemesEnabled}',
    'true'::jsonb,
    true
  ),
  updated_at = timezone('utc', now())
where flags->>'flightAwareEnabled' = 'true'
  and coalesce(flags->>'immersiveThemesEnabled', 'false') <> 'true';

comment on table public.user_feature_flags is
  'Server-read feature flags keyed by Clerk primary email and environment. Example flags: {"flightAwareEnabled": true, "immersiveThemesEnabled": true}.';
