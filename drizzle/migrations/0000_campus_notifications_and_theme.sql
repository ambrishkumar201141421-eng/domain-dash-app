alter table public.profiles
  add column if not exists theme_pref text not null default 'system' check (theme_pref in ('light','dark','system')),
  add column if not exists notify_campus_tasks boolean not null default false;

create index if not exists profiles_notify_domain_idx on public.profiles (college_domain) where notify_campus_tasks;

-- campus can't be changed directly by the user (prevents subscribing to another campus)
create or replace function public.protect_profile_domain()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.college_domain is distinct from old.college_domain and current_user = 'authenticated' then
    raise exception 'Campus cannot be changed here';
  end if;
  return new;
end; $$;
drop trigger if exists profiles_protect_domain on public.profiles;
create trigger profiles_protect_domain before update on public.profiles
  for each row execute function public.protect_profile_domain();

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id bigint references public.tasks(id) on delete cascade,
  type text not null default 'campus_task',
  title text not null,
  message text,
  reward text,
  campus text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notifications_select_own" on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- only is_read may be changed by the user
create or replace function public.protect_notification_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user = 'authenticated' and (new.user_id, new.task_id, new.type, new.title, coalesce(new.message,''), coalesce(new.reward,''), new.campus, new.created_at)
     is distinct from (old.user_id, old.task_id, old.type, old.title, coalesce(old.message,''), coalesce(old.reward,''), old.campus, old.created_at) then
    raise exception 'Only read status can be changed';
  end if;
  return new;
end; $$;
create trigger notifications_protect before update on public.notifications
  for each row execute function public.protect_notification_fields();

-- backend fan-out on task creation: one set-based insert using the partial index
create or replace function public.notify_campus_new_task()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_domain text;
begin
  select college_domain into v_domain from public.profiles where id = new.poster_id;
  if v_domain is null then return new; end if;
  insert into public.notifications (user_id, task_id, type, title, message, reward, campus)
  select p.id, new.id, 'campus_task', new.title, left(new.description, 140), new.reward, v_domain
  from public.profiles p
  where p.notify_campus_tasks and p.college_domain = v_domain
    and p.id <> new.poster_id and p.status = 'active';
  return new;
end; $$;
revoke execute on function public.notify_campus_new_task() from public, anon, authenticated;
create trigger tasks_notify_campus after insert on public.tasks
  for each row execute function public.notify_campus_new_task();

alter publication supabase_realtime add table public.notifications;