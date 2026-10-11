-- Postcard Studio core schema
-- Run in Supabase SQL Editor or via Supabase migrations.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  city text,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.friendship_status as enum ('pending','accepted','declined','blocked');
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status public.friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendship_no_self check (requester_id <> addressee_id),
  constraint friendship_pair_unique unique (requester_id, addressee_id)
);

create table if not exists public.style_skills (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  version text not null default '1.0.0',
  prompt_template text not null,
  negative_prompt text,
  workflow_json jsonb,
  license text,
  visibility text not null default 'public' check (visibility in ('private','public','review')),
  created_at timestamptz not null default now()
);

create type public.postcard_status as enum ('draft','processing','ready','sent','opened','archived','failed');
create table if not exists public.postcards (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  source_path text,
  rendered_path text,
  style_skill_id uuid references public.style_skills(id) on delete set null,
  title text not null default '',
  body text not null default '',
  city text,
  status public.postcard_status not null default 'draft',
  sent_at timestamptz,
  opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint postcard_no_self check (sender_id <> recipient_id)
);

create table if not exists public.postcard_events (
  id uuid primary key default gen_random_uuid(),
  postcard_id uuid not null references public.postcards(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('created','processing','ready','sent','opened','saved','reported')),
  created_at timestamptz not null default now()
);

create or replace function public.is_accepted_friend(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b) or (f.requester_id = b and f.addressee_id = a))
  );
$$;

create or replace function public.request_friend(target_id uuid)
returns public.friendships language plpgsql security invoker set search_path = public as $$
declare row public.friendships;
begin
  if target_id = auth.uid() then raise exception 'cannot friend yourself'; end if;
  insert into public.friendships (requester_id, addressee_id)
  values (auth.uid(), target_id)
  on conflict (requester_id, addressee_id) do update set status = 'pending', updated_at = now()
  returning * into row;
  return row;
end; $$;

create or replace function public.accept_friend(friendship_id uuid)
returns public.friendships language plpgsql security invoker set search_path = public as $$
declare row public.friendships;
begin
  update public.friendships set status = 'accepted', updated_at = now()
  where id = friendship_id and addressee_id = auth.uid() and status = 'pending'
  returning * into row;
  if row.id is null then raise exception 'friend request not found'; end if;
  return row;
end; $$;

create or replace function public.send_postcard(target_id uuid, card_title text, card_body text, card_city text, media_path text)
returns public.postcards language plpgsql security invoker set search_path = public as $$
declare row public.postcards;
begin
  if not public.is_accepted_friend(auth.uid(), target_id) then raise exception 'recipient is not an accepted friend'; end if;
  insert into public.postcards (sender_id, recipient_id, title, body, city, source_path, status, sent_at)
  values (auth.uid(), target_id, left(card_title,120), left(card_body,2000), left(card_city,100), media_path, 'sent', now())
  returning * into row;
  insert into public.postcard_events (postcard_id, actor_id, type) values (row.id, auth.uid(), 'sent');
  return row;
end; $$;

create or replace function public.open_postcard(card_id uuid)
returns public.postcards language plpgsql security invoker set search_path = public as $$
declare row public.postcards;
begin
  update public.postcards set status = 'opened', opened_at = coalesce(opened_at, now()), updated_at = now()
  where id = card_id and recipient_id = auth.uid()
  returning * into row;
  if row.id is null then raise exception 'postcard not found'; end if;
  insert into public.postcard_events (postcard_id, actor_id, type) values (row.id, auth.uid(), 'opened');
  return row;
end; $$;

revoke all on function public.request_friend(uuid) from public;
revoke all on function public.accept_friend(uuid) from public;
revoke all on function public.send_postcard(uuid,text,text,text,text) from public;
revoke all on function public.open_postcard(uuid) from public;
grant execute on function public.request_friend(uuid) to authenticated;
grant execute on function public.accept_friend(uuid) to authenticated;
grant execute on function public.send_postcard(uuid,text,text,text,text) to authenticated;
grant execute on function public.open_postcard(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.style_skills enable row level security;
alter table public.postcards enable row level security;
alter table public.postcard_events enable row level security;

create policy "profiles are visible to authenticated users" on public.profiles for select to authenticated using (true);
create policy "users manage own profile" on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "users view their friendships" on public.friendships for select to authenticated using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "users send friend requests" on public.friendships for insert to authenticated with check (requester_id = auth.uid());
create policy "participants update friendship" on public.friendships for update to authenticated using (requester_id = auth.uid() or addressee_id = auth.uid()) with check (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "requester deletes friendship" on public.friendships for delete to authenticated using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "public skills are readable" on public.style_skills for select to authenticated using (visibility = 'public' or owner_id = auth.uid());
create policy "owners create skills" on public.style_skills for insert to authenticated with check (owner_id = auth.uid());
create policy "owners update skills" on public.style_skills for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "participants view postcards" on public.postcards for select to authenticated using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "friends create postcards" on public.postcards for insert to authenticated with check (sender_id = auth.uid() and public.is_accepted_friend(sender_id, recipient_id));
create policy "senders update drafts" on public.postcards for update to authenticated using (sender_id = auth.uid() and status in ('draft','processing','ready','failed')) with check (sender_id = auth.uid() and public.is_accepted_friend(sender_id, recipient_id));
create policy "participants update received state" on public.postcards for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy "senders delete drafts" on public.postcards for delete to authenticated using (sender_id = auth.uid() and status = 'draft');

create policy "participants view postcard events" on public.postcard_events for select to authenticated using (actor_id = auth.uid() or exists (select 1 from public.postcards p where p.id = postcard_id and (p.sender_id = auth.uid() or p.recipient_id = auth.uid())));
create policy "participants add postcard events" on public.postcard_events for insert to authenticated with check (actor_id = auth.uid());

insert into storage.buckets (id, name, public) values ('postcard-media','postcard-media',false) on conflict (id) do nothing;
create policy "users upload own postcard media" on storage.objects for insert to authenticated with check (bucket_id = 'postcard-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users read own postcard media" on storage.objects for select to authenticated using (bucket_id = 'postcard-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete own postcard media" on storage.objects for delete to authenticated using (bucket_id = 'postcard-media' and (storage.foldername(name))[1] = auth.uid()::text);

