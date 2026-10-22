-- Section-specific post details (all optional, existing tasks unaffected)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS listing_type text,
  ADD COLUMN IF NOT EXISTS compensation text,
  ADD COLUMN IF NOT EXISTS group_pref text,
  ADD COLUMN IF NOT EXISTS group_size integer,
  ADD COLUMN IF NOT EXISTS planned_for timestamptz,
  ADD COLUMN IF NOT EXISTS location_note text;

ALTER TABLE public.tasks ADD CONSTRAINT tasks_listing_type_check CHECK (listing_type IS NULL OR listing_type IN ('request','offer'));
ALTER TABLE public.tasks ADD CONSTRAINT tasks_compensation_check CHECK (compensation IS NULL OR compensation IN ('paid','unpaid','exchange'));
ALTER TABLE public.tasks ADD CONSTRAINT tasks_group_pref_check CHECK (group_pref IS NULL OR group_pref IN ('partner','group','either'));
ALTER TABLE public.tasks ADD CONSTRAINT tasks_group_size_check CHECK (group_size IS NULL OR group_size BETWEEN 2 AND 50);
ALTER TABLE public.tasks ADD CONSTRAINT tasks_subcategory_len CHECK (subcategory IS NULL OR char_length(subcategory) <= 40);
ALTER TABLE public.tasks ADD CONSTRAINT tasks_location_note_len CHECK (location_note IS NULL OR char_length(location_note) <= 80);

ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS responded_at timestamptz;

-- New requests always start Pending on an open post; status only changes through the functions below.
CREATE OR REPLACE FUNCTION public.validate_chat_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare v_task public.tasks;
begin
  select * into v_task from public.tasks where id = new.task_id;
  if v_task.id is null then raise exception 'Post not found'; end if;
  if v_task.status <> 'Open' or (v_task.expires_at is not null and v_task.expires_at <= now()) then
    raise exception 'This post is no longer open';
  end if;
  new.status := 'Pending';
  new.poster_id := v_task.poster_id;
  new.created_at := now();
  new.responded_at := null;
  return new;
end; $$;

DROP TRIGGER IF EXISTS chats_validate_request ON public.chats;
CREATE TRIGGER chats_validate_request BEFORE INSERT ON public.chats
  FOR EACH ROW EXECUTE FUNCTION public.validate_chat_request();

-- "I'm Interested": idempotent, one request per student per post.
CREATE OR REPLACE FUNCTION public.request_to_join(p_task_id bigint)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare v_task public.tasks; v_chat public.chats; v_id bigint;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not public.is_active_user() then raise exception 'Your account is restricted'; end if;
  select * into v_task from public.tasks where id = p_task_id;
  if v_task.id is null or not exists (
    select 1 from public.profiles p where p.id = v_task.poster_id and p.college_domain = public.current_domain()
  ) then raise exception 'Post not found'; end if;
  if v_task.poster_id = auth.uid() then raise exception 'This is your own post'; end if;
  if v_task.status <> 'Open' or (v_task.expires_at is not null and v_task.expires_at <= now()) then
    raise exception 'This post is no longer open';
  end if;
  select * into v_chat from public.chats where task_id = p_task_id and applicant_id = auth.uid();
  if v_chat.id is not null then
    if v_chat.status = 'Withdrawn' then
      update public.chats set status = 'Pending', responded_at = null where id = v_chat.id;
    end if;
    return v_chat.id;
  end if;
  insert into public.chats (task_id, poster_id, applicant_id)
  values (p_task_id, v_task.poster_id, auth.uid()) returning id into v_id;
  return v_id;
end; $$;

CREATE OR REPLACE FUNCTION public.withdraw_request(p_chat_id bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare v_chat public.chats; v_task public.tasks;
begin
  select * into v_chat from public.chats where id = p_chat_id;
  if v_chat.id is null or v_chat.applicant_id <> auth.uid() then raise exception 'Not allowed'; end if;
  select * into v_task from public.tasks where id = v_chat.task_id;
  if v_task.category::text = 'Hustle' then raise exception 'Not allowed'; end if;
  if v_task.helper_id = auth.uid() then raise exception 'You are already confirmed for this post'; end if;
  if v_chat.status not in ('Pending','Accepted') then return; end if;
  update public.chats set status = 'Withdrawn', responded_at = now() where id = p_chat_id;
end; $$;

-- Organizer accepts or declines a request. Groups can accept several people up to the group size.
CREATE OR REPLACE FUNCTION public.respond_to_request(p_chat_id bigint, p_accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare v_chat public.chats; v_task public.tasks; v_count integer; v_target text;
begin
  select * into v_chat from public.chats where id = p_chat_id for update;
  if v_chat.id is null or v_chat.poster_id <> auth.uid() then raise exception 'Not allowed'; end if;
  if not public.is_active_user() then raise exception 'Your account is restricted'; end if;
  select * into v_task from public.tasks where id = v_chat.task_id for update;
  if v_task.category::text not in ('Playground','Lounge','Gigs') then
    raise exception 'Use the task chat to pick a helper';
  end if;
  v_target := case when p_accept then 'Accepted' else 'Declined' end;
  if v_chat.status = v_target then return; end if;
  if v_chat.status <> 'Pending' then raise exception 'This request was already answered'; end if;
  if p_accept then
    if v_task.status <> 'Open' then raise exception 'This post is closed'; end if;
    if v_task.group_size is not null then
      select count(*) into v_count from public.chats where task_id = v_task.id and status = 'Accepted';
      if v_count + 1 >= v_task.group_size then raise exception 'Your group is already full'; end if;
    end if;
  end if;
  update public.chats set status = v_target, responded_at = now() where id = p_chat_id;
end; $$;

-- Picking the helper (handshake PIN + ratings) stays for Campus Help and gig requests only.
CREATE OR REPLACE FUNCTION public.accept_applicant(p_chat_id bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare v_chat public.chats; v_task public.tasks;
begin
  select * into v_chat from public.chats where id = p_chat_id;
  if v_chat.id is null or v_chat.poster_id <> auth.uid() then raise exception 'Not allowed'; end if;
  select * into v_task from public.tasks where id = v_chat.task_id;
  if v_task.status <> 'Open' then raise exception 'This task is no longer open'; end if;
  if v_task.category::text in ('Playground','Lounge') then
    raise exception 'Accept requests from the post page instead';
  end if;
  if v_task.category::text = 'Gigs' then
    if coalesce(v_task.listing_type, 'request') <> 'request' then
      raise exception 'Skill offers stay open for more students';
    end if;
    if v_chat.status <> 'Accepted' then raise exception 'Accept their request first'; end if;
  end if;
  update public.tasks set status = 'Accepted', helper_id = v_chat.applicant_id,
    accepted_at = now(), handshake_pin = floor(random() * 9000 + 1000)::int
   where id = v_task.id;
  update public.chats set status = 'Accepted', responded_at = coalesce(responded_at, now()) where id = p_chat_id;
  update public.chats set status = 'Declined', responded_at = now()
   where task_id = v_task.id and id <> p_chat_id and status in ('Pending','Accepted');
end; $$;

-- Private chat opens only after acceptance, except the existing Campus Help chat.
CREATE OR REPLACE FUNCTION public.can_message_chat(p_chat_id bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists (
    select 1 from public.chats c join public.tasks t on t.id = c.task_id
    where c.id = p_chat_id
      and (c.poster_id = auth.uid() or c.applicant_id = auth.uid())
      and (t.category::text = 'Hustle' or c.status = 'Accepted')
  )
$$;

DROP POLICY IF EXISTS messages_insert_members ON public.messages;
CREATE POLICY messages_insert_members ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.can_message_chat(chat_id) AND public.is_active_user());

-- Notifications for requests and acceptances
CREATE OR REPLACE FUNCTION public.notify_chat_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare v_task public.tasks; v_name text; v_domain text; v_poster text;
begin
  select * into v_task from public.tasks where id = new.task_id;
  select full_name, college_domain into v_name, v_domain from public.profiles where id = new.applicant_id;
  select full_name into v_poster from public.profiles where id = new.poster_id;
  if v_domain is null then return new; end if;
  if tg_op = 'INSERT' or (old.status = 'Withdrawn' and new.status = 'Pending') then
    insert into public.notifications (user_id, task_id, type, title, message, campus)
    values (new.poster_id, new.task_id, 'post_request',
      coalesce(v_name, 'A student') || case when v_task.category::text = 'Hustle' then ' offered to help' else ' is interested' end,
      left(v_task.title, 140), v_domain);
  elsif old.status = 'Pending' and new.status = 'Accepted' then
    insert into public.notifications (user_id, task_id, type, title, message, campus)
    values (new.applicant_id, new.task_id, 'request_accepted',
      coalesce(v_poster, 'The organiser') || ' accepted your request', left(v_task.title, 140), v_domain);
  end if;
  return new;
end; $$;

DROP TRIGGER IF EXISTS chats_notify_request ON public.chats;
CREATE TRIGGER chats_notify_request AFTER INSERT OR UPDATE OF status ON public.chats
  FOR EACH ROW EXECUTE FUNCTION public.notify_chat_request();

-- Ended events take no new sign-ups or partner requests; existing matches and chats are kept.
CREATE POLICY participants_insert_live_event ON public.event_participants AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_participants.event_id AND e.status = 'published' AND e.partner_finder));
CREATE POLICY interests_insert_live_event ON public.event_interests AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_interests.event_id AND e.status = 'published' AND e.partner_finder));

GRANT EXECUTE ON FUNCTION public.request_to_join(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_request(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_request(bigint, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_message_chat(bigint) TO authenticated;