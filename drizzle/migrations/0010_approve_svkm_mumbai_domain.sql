CREATE OR REPLACE FUNCTION public.is_college_domain(p_domain text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  select lower(coalesce(p_domain, '')) ~ '\.(edu|edu\.[a-z]{2}|ac\.[a-z]{2})$'
      or lower(coalesce(p_domain, '')) = any (array[
           'svkmmumbai.onmicrosoft.com'
         ]::text[])
$$;

CREATE OR REPLACE FUNCTION public.ensure_profile(p_full_name text)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare v_email text; v_domain text; v_profile public.profiles;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then raise exception 'Not authenticated'; end if;
  v_domain := lower(split_part(v_email, '@', 2));
  if not public.is_college_domain(v_domain) then
    raise exception 'Only official college email addresses are allowed';
  end if;
  insert into public.profiles (id, full_name, college_domain)
  values (auth.uid(), coalesce(nullif(trim(p_full_name), ''), split_part(v_email, '@', 1)), v_domain)
  on conflict (id) do update set full_name = coalesce(nullif(trim(excluded.full_name), ''), public.profiles.full_name)
  returning * into v_profile;
  return v_profile;
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_profile_college_domain()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
begin
  if not public.is_college_domain(new.college_domain) then
    raise exception 'Only official college email addresses are allowed';
  end if;
  return new;
end; $$;

DROP TRIGGER IF EXISTS profiles_enforce_college_domain ON public.profiles;
CREATE TRIGGER profiles_enforce_college_domain
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_college_domain();