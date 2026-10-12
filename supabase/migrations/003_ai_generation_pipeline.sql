create table if not exists public.ai_generation_jobs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 request_key uuid not null, skill_id text not null, skill_version text not null,
 provider text not null check (provider in ('openai','gemini','bfl')), model text not null,
 source_path text not null, metadata jsonb not null default '{}',
 status text not null default 'queued' check (status in ('queued','generating','succeeded','failed')),
 front_path text, back_path text, usage jsonb, error_code text, postcard_id uuid references public.postcards(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,request_key)
);
alter table public.ai_generation_jobs enable row level security;
drop policy if exists "owners read ai jobs" on public.ai_generation_jobs;
create policy "owners read ai jobs" on public.ai_generation_jobs for select to authenticated using (user_id=(select auth.uid()));
grant select on public.ai_generation_jobs to authenticated; grant all on public.ai_generation_jobs to service_role;
create index if not exists ai_jobs_owner_created on public.ai_generation_jobs(user_id,created_at desc);
alter table public.postcards add column if not exists back_path text;

create or replace function public.reserve_ai_job(owner uuid, request_key uuid, skill text, version text, provider_name text, model_name text, photo_path text, card_metadata jsonb)
returns public.ai_generation_jobs language plpgsql security definer set search_path='' as $$
declare existing public.ai_generation_jobs;
begin
 perform pg_advisory_xact_lock(hashtextextended(owner::text,0));
 select * into existing from public.ai_generation_jobs j where j.user_id=owner and j.request_key=reserve_ai_job.request_key;
 if existing.id is not null then return existing; end if;
 if (select count(*) from public.ai_generation_jobs where user_id=owner and created_at>now()-interval '24 hours') >= 10 then raise exception 'DAILY_LIMIT'; end if;
 if exists(select 1 from public.ai_generation_jobs where user_id=owner and status in ('queued','generating') and created_at>now()-interval '10 minutes') then raise exception 'ACTIVE_JOB'; end if;
 insert into public.ai_generation_jobs(user_id,request_key,skill_id,skill_version,provider,model,source_path,metadata) values(owner,request_key,skill,version,provider_name,model_name,photo_path,card_metadata) returning * into existing;
 return existing;
end $$;
revoke all on function public.reserve_ai_job(uuid,uuid,text,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.reserve_ai_job(uuid,uuid,text,text,text,text,text,jsonb) to service_role;

create or replace function public.send_ai_postcard(job_id uuid,target_id uuid,card_title text,card_body text,card_city text)
returns public.postcards language plpgsql security definer set search_path='' as $$
declare job public.ai_generation_jobs; card public.postcards;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into job from public.ai_generation_jobs where id=job_id and user_id=auth.uid() for update;
 if job.id is null or job.status<>'succeeded' then raise exception 'RESULT_NOT_READY'; end if;
 if job.postcard_id is not null then select * into card from public.postcards where id=job.postcard_id; if card.recipient_id<>target_id then raise exception 'ALREADY_SENT'; end if; return card; end if;
 if not public.is_accepted_friend(auth.uid(),target_id) then raise exception 'FRIEND_REQUIRED'; end if;
 if card_title is null or length(trim(card_title)) not between 1 and 120 or card_body is null or card_city is null or length(card_body)>2000 or length(card_city)>100 then raise exception 'INVALID_TEXT'; end if;
 insert into public.postcards(sender_id,recipient_id,title,body,city,source_path,rendered_path,back_path,status,sent_at)
 values(auth.uid(),target_id,card_title,card_body,card_city,job.source_path,job.front_path,job.back_path,'sent',now()) returning * into card;
 insert into public.postcard_events(postcard_id,actor_id,type) values(card.id,auth.uid(),'sent');
 update public.ai_generation_jobs set postcard_id=card.id,updated_at=now() where id=job.id;
 return card;
end $$;
revoke all on function public.send_ai_postcard(uuid,uuid,text,text,text) from public,anon;
grant execute on function public.send_ai_postcard(uuid,uuid,text,text,text) to authenticated;

drop policy if exists "recipients read ai postcard back" on storage.objects;
create policy "recipients read ai postcard back" on storage.objects for select to authenticated using (bucket_id='postcard-media' and exists(select 1 from public.postcards p where (p.rendered_path=name or p.back_path=name) and p.recipient_id=(select auth.uid()) and p.status in ('sent','opened','archived')));

create or replace function public.guard_postcard_back() returns trigger language plpgsql set search_path='' as $$
begin
 if new.back_path is distinct from old.back_path then raise exception 'sent postcard back is immutable'; end if;
 return new;
end $$;
drop trigger if exists guard_postcard_back on public.postcards;
create trigger guard_postcard_back before update on public.postcards for each row execute function public.guard_postcard_back();

