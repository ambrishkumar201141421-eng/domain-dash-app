revoke all on function public.has_role(uuid, public.app_role) from public, anon;
revoke all on function public.is_active_user() from public, anon;
revoke all on function public.record_violation(text, text[], text) from public, anon;
revoke all on function public.review_flag(bigint, boolean) from public, anon;
revoke all on function public.expire_verification() from public, anon;
revoke all on function public.protect_profile_status() from public, anon, authenticated;

grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.record_violation(text, text[], text) to authenticated;
grant execute on function public.review_flag(bigint, boolean) to authenticated;
grant execute on function public.expire_verification() to authenticated;