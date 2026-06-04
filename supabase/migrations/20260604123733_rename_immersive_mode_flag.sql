update public.user_feature_flags
set flags = case
  when coalesce(flags->>'immersiveThemesEnabled', 'false') = 'true'
    then (flags - 'immersiveThemesEnabled') || jsonb_build_object('immersiveModeEnabled', true)
  else flags - 'immersiveThemesEnabled'
end
where flags ? 'immersiveThemesEnabled';

comment on table public.user_feature_flags is
  'Server-read feature flags keyed by Clerk primary email and environment. Example flags: {"flightAwareEnabled": true, "immersiveModeEnabled": true}.';
