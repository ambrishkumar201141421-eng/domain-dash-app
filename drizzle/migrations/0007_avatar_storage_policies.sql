CREATE POLICY avatars_read_authenticated ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');
CREATE POLICY avatars_insert_own ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
    AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp') AND public.is_active_user());
CREATE POLICY avatars_update_own ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
    AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp'));
CREATE POLICY avatars_delete_own ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Profile pictures may only point at the owner's own folder in the avatars bucket.
CREATE OR REPLACE FUNCTION public.validate_avatar_url()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
begin
  if new.avatar_url is distinct from old.avatar_url and new.avatar_url is not null and current_user = 'authenticated'
     and new.avatar_url !~ ('^avatars/' || new.id::text || '/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$') then
    raise exception 'Invalid profile picture';
  end if;
  return new;
end; $$;
CREATE TRIGGER profiles_validate_avatar BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_avatar_url();