CREATE OR REPLACE FUNCTION public.protect_interest_fields()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
begin
  if current_user = 'authenticated' and (new.event_id, new.from_user, new.to_user, new.created_at) is distinct from (old.event_id, old.from_user, old.to_user, old.created_at) then
    raise exception 'Only the response can be changed';
  end if;
  if new.status is distinct from old.status then
    if current_user = 'authenticated' and old.status <> 'pending' then
      raise exception 'This request has already been answered';
    end if;
    new.responded_at := now();
  end if;
  return new;
end; $function$;

CREATE OR REPLACE FUNCTION public.notify_event_interest_accepted()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_accepter text; v_sender text; v_event text; v_campus text;
begin
  if new.status <> 'accepted' or old.status = 'accepted' then return new; end if;
  select full_name into v_accepter from public.profiles where id = new.to_user;
  select full_name into v_sender from public.profiles where id = new.from_user;
  select title into v_event from public.events where id = new.event_id;
  select college_domain into v_campus from public.profiles where id = new.from_user;
  if v_campus is not null then
    insert into public.notifications (user_id, task_id, type, title, message, reward, campus)
    values (new.from_user, null, 'garba_match', 'It''s a match!',
            coalesce(v_accepter, 'A student') || ' accepted your interest for ' || coalesce(v_event, 'the event') || '. You can now chat.', null, v_campus),
           (new.to_user, null, 'garba_match', 'It''s a match!',
            'You and ' || coalesce(v_sender, 'a student') || ' are matched for ' || coalesce(v_event, 'the event') || '. Say hi in your private chat.', null, v_campus);
  end if;
  return new;
end;
$function$;