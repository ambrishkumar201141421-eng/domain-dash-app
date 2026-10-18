
CREATE OR REPLACE FUNCTION public.notify_event_interest()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare v_sender text; v_event text; v_campus text;
begin
  select full_name into v_sender from public.profiles where id = new.from_user;
  select title into v_event from public.events where id = new.event_id;
  select college_domain into v_campus from public.profiles where id = new.to_user;
  if v_campus is null then return new; end if;
  insert into public.notifications (user_id, task_id, type, title, message, reward, campus)
  values (new.to_user, null, 'garba_interest',
          coalesce(v_sender, 'A student') || ' is interested in you',
          'Open ' || coalesce(v_event, 'the event') || ' to accept or decline.',
          null, v_campus);
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.notify_event_interest_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare v_accepter text; v_event text; v_campus text;
begin
  if new.status <> 'accepted' or old.status = 'accepted' then return new; end if;
  select full_name into v_accepter from public.profiles where id = new.to_user;
  select title into v_event from public.events where id = new.event_id;
  select college_domain into v_campus from public.profiles where id = new.from_user;
  if v_campus is not null then
    insert into public.notifications (user_id, task_id, type, title, message, reward, campus)
    values (new.from_user, null, 'garba_match',
            'It''s a match!',
            coalesce(v_accepter, 'A student') || ' accepted your interest for ' || coalesce(v_event, 'the event') || '. You can now chat.',
            null, v_campus);
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.notify_connection_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare v_interest public.event_interests; v_recipient uuid; v_sender text; v_campus text;
begin
  select * into v_interest from public.event_interests where id = new.interest_id;
  if v_interest is null or v_interest.status <> 'accepted' then return new; end if;
  v_recipient := case when v_interest.from_user = new.sender_id then v_interest.to_user else v_interest.from_user end;
  select full_name into v_sender from public.profiles where id = new.sender_id;
  select college_domain into v_campus from public.profiles where id = v_recipient;
  if v_campus is null then return new; end if;
  insert into public.notifications (user_id, task_id, type, title, message, reward, campus)
  values (v_recipient, null, 'garba_message',
          'New message from ' || coalesce(v_sender, 'your connection'),
          left(new.message_text, 140), null, v_campus);
  return new;
end;
$function$;

CREATE TRIGGER event_interests_notify_insert
  AFTER INSERT ON public.event_interests
  FOR EACH ROW EXECUTE FUNCTION public.notify_event_interest();

CREATE TRIGGER event_interests_notify_accept
  AFTER UPDATE ON public.event_interests
  FOR EACH ROW EXECUTE FUNCTION public.notify_event_interest_accepted();

CREATE TRIGGER connection_messages_notify
  AFTER INSERT ON public.connection_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_connection_message();
