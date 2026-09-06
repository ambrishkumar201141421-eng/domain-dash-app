
create type public.task_category as enum ('Hustle','Playground','Lounge');
create type public.task_status as enum ('Open','Accepted','Completed','Expired','Cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Student',
  college_domain text not null,
  rating real not null default 5.0,
  ratings_count integer not null default 0,
  avatar_url text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create or replace function public.current_domain()
returns text language sql stable security definer set search_path = public as $$
  select college_domain from public.profiles where id = auth.uid()
$$;

create policy "profiles_select_same_campus" on public.profiles for select to authenticated
  using (id = auth.uid() or college_domain = public.current_domain());
create policy "profiles_insert_own" on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create table public.tasks (
  id bigint generated always as identity primary key,
  poster_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  category public.task_category not null,
  reward text not null,
  status public.task_status not null default 'Open',
  helper_id uuid references public.profiles(id) on delete set null,
  handshake_pin integer,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  accepted_at timestamptz,
  completed_at timestamptz
);
grant select (id, poster_id, title, description, category, reward, status, helper_id, created_at, expires_at, accepted_at, completed_at) on public.tasks to authenticated;
grant insert (poster_id, title, description, category, reward, expires_at), update (title, description, status) on public.tasks to authenticated;
grant all on public.tasks to service_role;
alter table public.tasks enable row level security;

create policy "tasks_select_same_campus" on public.tasks for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = tasks.poster_id and p.college_domain = public.current_domain()));
create policy "tasks_insert_own" on public.tasks for insert to authenticated
  with check (poster_id = auth.uid());
create policy "tasks_update_own" on public.tasks for update to authenticated
  using (poster_id = auth.uid()) with check (poster_id = auth.uid());

create or replace function public.enforce_task_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare active_count integer;
begin
  select count(*) into active_count from public.tasks
   where poster_id = new.poster_id and status in ('Open','Accepted')
     and (expires_at is null or expires_at > now());
  if active_count >= 3 then
    raise exception 'You already have 3 active tasks. Complete or cancel one first.';
  end if;
  return new;
end;
$$;
create trigger tasks_limit before insert on public.tasks
  for each row execute function public.enforce_task_limit();

create table public.chats (
  id bigint generated always as identity primary key,
  task_id bigint not null references public.tasks(id) on delete cascade,
  poster_id uuid not null references public.profiles(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'Pending',
  created_at timestamptz not null default now(),
  unique (task_id, applicant_id)
);
grant select, insert on public.chats to authenticated;
grant all on public.chats to service_role;
alter table public.chats enable row level security;

create policy "chats_select_participants" on public.chats for select to authenticated
  using (auth.uid() = poster_id or auth.uid() = applicant_id);
create policy "chats_insert_applicant" on public.chats for insert to authenticated
  with check (auth.uid() = applicant_id and exists (
    select 1 from public.tasks t where t.id = task_id and t.poster_id = chats.poster_id and t.poster_id <> auth.uid()
  ));

create table public.messages (
  id bigint generated always as identity primary key,
  chat_id bigint not null references public.chats(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  message_text text not null check (char_length(message_text) between 1 and 1000),
  created_at timestamptz not null default now()
);
grant select, insert on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;

create or replace function public.is_chat_member(p_chat_id bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.chats c where c.id = p_chat_id and (c.poster_id = auth.uid() or c.applicant_id = auth.uid()))
$$;

create policy "messages_select_members" on public.messages for select to authenticated
  using (public.is_chat_member(chat_id));
create policy "messages_insert_members" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_chat_member(chat_id));

create table public.ratings (
  id bigint generated always as identity primary key,
  task_id bigint not null references public.tasks(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  stars integer not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (task_id, reviewer_id)
);
grant select, insert on public.ratings to authenticated;
grant all on public.ratings to service_role;
alter table public.ratings enable row level security;

create policy "ratings_select_same_campus" on public.ratings for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = ratings.reviewee_id and p.college_domain = public.current_domain()));
create policy "ratings_insert_participant" on public.ratings for insert to authenticated
  with check (reviewer_id = auth.uid() and exists (
    select 1 from public.tasks t where t.id = task_id and t.status = 'Completed'
      and ((t.poster_id = auth.uid() and t.helper_id = reviewee_id) or (t.helper_id = auth.uid() and t.poster_id = reviewee_id))
  ));

create or replace function public.refresh_rating()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles p set
    rating = sub.avg_stars,
    ratings_count = sub.cnt
  from (select avg(stars)::real as avg_stars, count(*)::int as cnt from public.ratings where reviewee_id = new.reviewee_id) sub
  where p.id = new.reviewee_id;
  return new;
end;
$$;
create trigger ratings_refresh after insert on public.ratings
  for each row execute function public.refresh_rating();

create or replace function public.ensure_profile(p_full_name text)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare v_email text; v_domain text; v_profile public.profiles;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then raise exception 'Not authenticated'; end if;
  v_domain := lower(split_part(v_email, '@', 2));
  if not (v_domain ~ '\.(edu|edu\.[a-z]{2}|ac\.[a-z]{2})$') then
    raise exception 'Only official college email addresses are allowed';
  end if;
  insert into public.profiles (id, full_name, college_domain)
  values (auth.uid(), coalesce(nullif(trim(p_full_name), ''), split_part(v_email, '@', 1)), v_domain)
  on conflict (id) do update set full_name = coalesce(nullif(trim(excluded.full_name), ''), public.profiles.full_name)
  returning * into v_profile;
  return v_profile;
end;
$$;
grant execute on function public.ensure_profile(text) to authenticated;

create or replace function public.get_handshake_pin(p_task_id bigint)
returns integer language plpgsql stable security definer set search_path = public as $$
declare v_pin integer;
begin
  select handshake_pin into v_pin from public.tasks where id = p_task_id and poster_id = auth.uid();
  return v_pin;
end;
$$;
grant execute on function public.get_handshake_pin(bigint) to authenticated;

create or replace function public.accept_applicant(p_chat_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare v_chat public.chats; v_task public.tasks;
begin
  select * into v_chat from public.chats where id = p_chat_id;
  if v_chat is null or v_chat.poster_id <> auth.uid() then raise exception 'Not allowed'; end if;
  select * into v_task from public.tasks where id = v_chat.task_id;
  if v_task.status <> 'Open' then raise exception 'This task is no longer open'; end if;
  update public.tasks set status = 'Accepted', helper_id = v_chat.applicant_id,
    accepted_at = now(), handshake_pin = floor(random() * 9000 + 1000)::int
   where id = v_task.id;
  update public.chats set status = 'Accepted' where id = p_chat_id;
  update public.chats set status = 'Declined' where task_id = v_task.id and id <> p_chat_id;
end;
$$;
grant execute on function public.accept_applicant(bigint) to authenticated;

create or replace function public.complete_task(p_task_id bigint, p_pin integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_task public.tasks;
begin
  select * into v_task from public.tasks where id = p_task_id;
  if v_task is null or v_task.helper_id <> auth.uid() then raise exception 'Not allowed'; end if;
  if v_task.status <> 'Accepted' then raise exception 'Task is not in progress'; end if;
  if v_task.handshake_pin is distinct from p_pin then return false; end if;
  update public.tasks set status = 'Completed', completed_at = now() where id = p_task_id;
  return true;
end;
$$;
grant execute on function public.complete_task(bigint, integer) to authenticated;

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.tasks;
