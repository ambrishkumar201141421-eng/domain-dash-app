CREATE TYPE public.event_status AS ENUM ('draft','published','archived');

CREATE TABLE public.events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 80),
  headline text,
  subtitle text,
  description text,
  category text NOT NULL DEFAULT 'Festive' CHECK (category IN ('Festive','College Fest','Music','Sports','Outdoor')),
  image_url text,
  image_alt text,
  cta_label text NOT NULL DEFAULT 'Explore Event',
  cta_path text CHECK (cta_path IS NULL OR cta_path LIKE '/%'),
  starts_at timestamptz,
  ends_at timestamptz,
  venue text,
  campus_domain text,
  status public.event_status NOT NULL DEFAULT 'draft',
  is_featured boolean NOT NULL DEFAULT false,
  is_official boolean NOT NULL DEFAULT false,
  partner_finder boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 100,
  publish_at timestamptz,
  expires_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY events_select_visible ON public.events FOR SELECT TO authenticated USING (
  (status = 'published' AND (publish_at IS NULL OR publish_at <= now()) AND (expires_at IS NULL OR expires_at > now())
   AND (campus_domain IS NULL OR campus_domain = public.current_domain()))
  OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY events_admin_insert ON public.events FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY events_admin_update ON public.events FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY events_admin_delete ON public.events FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
begin new.updated_at := now(); return new; end; $$;
CREATE TRIGGER events_touch BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.event_participants (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id bigint NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  college_domain text NOT NULL DEFAULT '',
  experience text NOT NULL DEFAULT 'Just Here to Have Fun' CHECK (experience IN ('Beginner','Intermediate','Experienced','Just Here to Have Fun')),
  group_pref text NOT NULL DEFAULT 'Open to Either' CHECK (group_pref IN ('Partner','Small Group','Open to Either')),
  availability text CHECK (availability IS NULL OR char_length(availability) <= 60),
  intro text CHECK (intro IS NULL OR char_length(intro) <= 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_participants TO authenticated;
GRANT ALL ON public.event_participants TO service_role;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_participant_campus() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
begin
  select college_domain into new.college_domain from public.profiles where id = new.user_id;
  if new.college_domain is null then raise exception 'Profile not found'; end if;
  new.updated_at := now();
  return new;
end; $$;
CREATE TRIGGER event_participants_campus BEFORE INSERT OR UPDATE ON public.event_participants FOR EACH ROW EXECUTE FUNCTION public.set_participant_campus();

CREATE POLICY participants_select_campus ON public.event_participants FOR SELECT TO authenticated USING (user_id = auth.uid() OR college_domain = public.current_domain());
CREATE POLICY participants_insert_own ON public.event_participants FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND public.is_active_user()
  AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.partner_finder));
CREATE POLICY participants_update_own ON public.event_participants FOR UPDATE TO authenticated USING (user_id = auth.uid() AND public.is_active_user()) WITH CHECK (user_id = auth.uid());
CREATE POLICY participants_delete_own ON public.event_participants FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.event_interests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id bigint NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  from_user uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (event_id, from_user, to_user),
  CHECK (from_user <> to_user)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_interests TO authenticated;
GRANT ALL ON public.event_interests TO service_role;
ALTER TABLE public.event_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY interests_select_own ON public.event_interests FOR SELECT TO authenticated USING (from_user = auth.uid() OR to_user = auth.uid());
CREATE POLICY interests_insert_own ON public.event_interests FOR INSERT TO authenticated WITH CHECK (
  from_user = auth.uid() AND status = 'pending' AND public.is_active_user()
  AND EXISTS (SELECT 1 FROM public.event_participants p WHERE p.event_id = event_interests.event_id AND p.user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.event_participants p WHERE p.event_id = event_interests.event_id AND p.user_id = event_interests.to_user AND p.college_domain = public.current_domain())
  AND NOT EXISTS (SELECT 1 FROM public.event_interests r WHERE r.event_id = event_interests.event_id AND r.from_user = event_interests.to_user AND r.to_user = auth.uid()));
CREATE POLICY interests_update_recipient ON public.event_interests FOR UPDATE TO authenticated USING (to_user = auth.uid() AND public.is_active_user()) WITH CHECK (to_user = auth.uid() AND status IN ('accepted','declined'));
CREATE POLICY interests_delete_sender ON public.event_interests FOR DELETE TO authenticated USING (from_user = auth.uid() AND status = 'pending');

CREATE OR REPLACE FUNCTION public.protect_interest_fields() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
begin
  if current_user = 'authenticated' and (new.event_id, new.from_user, new.to_user, new.created_at) is distinct from (old.event_id, old.from_user, old.to_user, old.created_at) then
    raise exception 'Only the response can be changed';
  end if;
  if new.status is distinct from old.status then new.responded_at := now(); end if;
  return new;
end; $$;
CREATE TRIGGER event_interests_protect BEFORE UPDATE ON public.event_interests FOR EACH ROW EXECUTE FUNCTION public.protect_interest_fields();

CREATE OR REPLACE FUNCTION public.is_connection_member(p_interest_id bigint) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select exists (select 1 from public.event_interests i where i.id = p_interest_id and i.status = 'accepted' and (i.from_user = auth.uid() or i.to_user = auth.uid()))
$$;
REVOKE EXECUTE ON FUNCTION public.is_connection_member(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_connection_member(bigint) TO authenticated;

CREATE TABLE public.connection_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  interest_id bigint NOT NULL REFERENCES public.event_interests(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_text text NOT NULL CHECK (char_length(trim(message_text)) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.connection_messages TO authenticated;
GRANT ALL ON public.connection_messages TO service_role;
ALTER TABLE public.connection_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY connection_messages_select ON public.connection_messages FOR SELECT TO authenticated USING (public.is_connection_member(interest_id));
CREATE POLICY connection_messages_insert ON public.connection_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND public.is_active_user() AND public.is_connection_member(interest_id));

CREATE OR REPLACE FUNCTION public.report_student(p_user_id uuid, p_reason text, p_context text DEFAULT 'event_report') RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if p_user_id = auth.uid() then raise exception 'You cannot report yourself'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id and college_domain = public.current_domain()) then raise exception 'Student not found'; end if;
  insert into public.moderation_flags (user_id, content, matched_terms, context)
  values (p_user_id, left('Reported by a student: ' || coalesce(nullif(trim(p_reason), ''), 'No reason given'), 2000), '{}', left(coalesce(p_context, 'event_report'), 40));
end; $$;
REVOKE EXECUTE ON FUNCTION public.report_student(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_student(uuid, text, text) TO authenticated;

CREATE POLICY event_art_admin_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'event-art' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY event_art_admin_update ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'event-art' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY event_art_admin_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'event-art' AND public.has_role(auth.uid(), 'admin'));

INSERT INTO public.events (slug, title, headline, subtitle, description, category, image_url, image_alt, cta_label, cta_path, status, is_featured, partner_finder, display_order) VALUES
('garba-night','Garba Night','Find Your Garba Partner','Don''t go solo.','Don''t go solo. Find students from your campus who are ready to dance, celebrate, and make memories this Navratri.','Festive','/events/garba.jpg','Illustration of college students in colourful festive outfits dancing Garba in a circle with dandiya sticks under glowing lanterns','Find Your Partner','/events/garba-night/partners','published',true,true,1),
('diwali-celebration','Diwali Celebration','Celebrate with Your Campus Community','Lights, sweets and good company.','Find classmates to light diyas, share sweets and celebrate Diwali together on campus.','Festive','/events/diwali.jpg','Illustration of students lighting diyas and sparklers together on a campus lawn at night','Find Your Crew','/events/diwali-celebration/partners','published',true,true,2),
('college-fest','College Fest','Discover Events and Meet New People','Fest season is better together.','Team up with students from your campus to explore fest events, competitions and stalls.','College Fest','/events/fest.jpg','Illustration of a busy college fest with stalls, banners and students exploring together','Explore Event','/events/college-fest','published',true,false,3),
('concert-night','Concert Night','Find Friends to Attend With','Sing louder with friends.','Looking for people to go to a concert with? Find students from your campus who share your music taste.','Music','/events/concert.jpg','Illustration of college friends cheering at an outdoor concert under stage lights','Find Friends','/events/concert-night/partners','published',true,true,4),
('badminton-partners','Badminton Partners','Find Players from Your Campus','Doubles needs four.','Find a badminton partner or a doubles team from your own campus, at any skill level.','Sports','/events/badminton.jpg','Illustration of students playing a friendly doubles badminton match in a campus court','Find Players','/events/badminton-partners/partners','published',true,true,5),
('trekking-adventures','Trekking Adventures','Find Your Next Adventure Partner','The hills are calling.','Plan a trek with students from your campus. Find people who match your pace and plans.','Outdoor','/events/trek.jpg','Illustration of a group of students hiking a scenic mountain trail at sunrise','Find Trek Buddies','/events/trekking-adventures/partners','published',true,true,6);