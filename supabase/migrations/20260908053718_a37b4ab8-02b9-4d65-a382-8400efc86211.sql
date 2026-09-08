-- 1. Enums
create type public.account_status as enum ('active', 'in_verification', 'permanently_banned');
create type public.app_role as enum ('admin', 'moderator', 'user');
create type public.flag_review_status as enum ('pending', 'guilty', 'cleared');

-- 2. Roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

create policy user_roles_select_own on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- 3. Profile status columns
alter table public.profiles
  add column status public.account_status not null default 'active',
  add column suspended_until timestamptz;

-- 4. Moderation queue
create table public.moderation_flags (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  matched_terms text[] not null default '{}',
  context text not null default 'task',
  review_status public.flag_review_status not null default 'pending',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
grant select on public.moderation_flags to authenticated;
grant all on public.moderation_flags to service_role;
alter table public.moderation_flags enable row level security;

create policy moderation_flags_select_own on public.moderation_flags
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create index moderation_flags_pending_idx on public.moderation_flags (review_status, created_at desc);

-- 5. Account state helper: active only, with automatic expiry of the 30-day window
create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
  )
$$;
grant execute on function public.is_active_user() to authenticated;

-- 6. Prevent self-service status changes
create or replace function public.protect_profile_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.status is distinct from old.status or new.suspended_until is distinct from old.suspended_until)
     and not public.has_role(auth.uid(), 'admin') then
    raise exception 'Account status cannot be changed here';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_status
  before update on public.profiles
  for each row execute function public.protect_profile_status();

-- 7. Record a violation: reject content, enter 30-day verification, queue for review
create or replace function public.record_violation(p_content text, p_terms text[], p_context text default 'task')
returns public.profiles language plpgsql security definer set search_path = public as $$
declare v_profile public.profiles;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  insert into public.moderation_flags (user_id, content, matched_terms, context)
  values (auth.uid(), left(p_content, 2000), coalesce(p_terms, '{}'), coalesce(p_context, 'task'));

  update public.profiles
     set status = case when status = 'permanently_banned' then status else 'in_verification' end,
         suspended_until = case when status = 'permanently_banned' then suspended_until else now() + interval '30 days' end
   where id = auth.uid()
  returning * into v_profile;

  return v_profile;
end;
$$;
grant execute on function public.record_violation(text, text[], text) to authenticated;

-- 8. Admin verdicts
create or replace function public.review_flag(p_flag_id bigint, p_guilty boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_flag public.moderation_flags;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Not allowed'; end if;
  select * into v_flag from public.moderation_flags where id = p_flag_id;
  if v_flag is null then raise exception 'Flag not found'; end if;

  update public.moderation_flags
     set review_status = case when p_guilty then 'guilty' else 'cleared' end,
         reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_flag_id;

  if p_guilty then
    update public.profiles set status = 'permanently_banned', suspended_until = null where id = v_flag.user_id;
  else
    update public.profiles set status = 'active', suspended_until = null where id = v_flag.user_id;
  end if;
end;
$$;
grant execute on function public.review_flag(bigint, boolean) to authenticated;

-- 9. Auto-expire the 30-day window when it lapses without a guilty verdict
create or replace function public.expire_verification()
returns void language sql security definer set search_path = public as $$
  update public.profiles
     set status = 'active', suspended_until = null
   where id = auth.uid()
     and status = 'in_verification'
     and suspended_until is not null
     and suspended_until <= now();
$$;
grant execute on function public.expire_verification() to authenticated;

-- 10. Enforce account state on every write path
drop policy tasks_insert_own on public.tasks;
create policy tasks_insert_own on public.tasks
  for insert to authenticated
  with check (poster_id = auth.uid() and public.is_active_user());

drop policy tasks_update_own on public.tasks;
create policy tasks_update_own on public.tasks
  for update to authenticated
  using (poster_id = auth.uid() and public.is_active_user())
  with check (poster_id = auth.uid() and public.is_active_user());

drop policy chats_insert_applicant on public.chats;
create policy chats_insert_applicant on public.chats
  for insert to authenticated
  with check (
    auth.uid() = applicant_id
    and public.is_active_user()
    and exists (select 1 from public.tasks t where t.id = task_id and t.poster_id = chats.poster_id and t.poster_id <> auth.uid())
  );

drop policy messages_insert_members on public.messages;
create policy messages_insert_members on public.messages
  for insert to authenticated
  with check (sender_id = auth.uid() and public.is_chat_member(chat_id) and public.is_active_user());

drop policy ratings_insert_participant on public.ratings;
create policy ratings_insert_participant on public.ratings
  for insert to authenticated
  with check (
    reviewer_id = auth.uid()
    and public.is_active_user()
    and exists (
      select 1 from public.tasks t
      where t.id = ratings.task_id and t.status = 'Completed'
        and ((t.poster_id = auth.uid() and t.helper_id = ratings.reviewee_id)
          or (t.helper_id = auth.uid() and t.poster_id = ratings.reviewee_id))
    )
  );