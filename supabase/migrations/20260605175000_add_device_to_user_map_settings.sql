alter table public.user_map_settings
  add column if not exists device text not null default 'desktop';

alter table public.user_map_settings
  drop constraint if exists user_map_settings_pkey;

alter table public.user_map_settings
  add constraint user_map_settings_device_check
    check (device in ('desktop', 'mobile'));

alter table public.user_map_settings
  add constraint user_map_settings_pkey
    primary key (email, environment, device);

comment on column public.user_map_settings.device is
  'Settings target device type. Signed-in users can keep separate desktop and mobile map settings.';

comment on table public.user_map_settings is
  'Server-managed map mode and layer settings keyed by Clerk primary email, environment, and device.';
