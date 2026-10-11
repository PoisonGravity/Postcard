-- APNs device registration prepared for the native SwiftUI client.
-- Apply after reviewing in Supabase; the current Vite MVP does not write this table yet.
create table if not exists public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_token text not null,
  platform text not null default 'ios' check (platform in ('ios','ipadOS')),
  environment text not null default 'sandbox' check (environment in ('sandbox','production')),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, device_token)
);

alter table public.push_devices enable row level security;
create policy "users manage own push devices" on public.push_devices
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists push_devices_user_active on public.push_devices(user_id) where revoked_at is null;
