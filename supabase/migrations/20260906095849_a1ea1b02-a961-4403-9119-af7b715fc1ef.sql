
revoke all on function public.current_domain() from public, anon, authenticated;
revoke all on function public.is_chat_member(bigint) from public, anon, authenticated;
revoke all on function public.enforce_task_limit() from public, anon, authenticated;
revoke all on function public.refresh_rating() from public, anon, authenticated;
revoke all on function public.ensure_profile(text) from public, anon;
revoke all on function public.get_handshake_pin(bigint) from public, anon;
revoke all on function public.accept_applicant(bigint) from public, anon;
revoke all on function public.complete_task(bigint, integer) from public, anon;
grant execute on function public.ensure_profile(text) to authenticated;
grant execute on function public.get_handshake_pin(bigint) to authenticated;
grant execute on function public.accept_applicant(bigint) to authenticated;
grant execute on function public.complete_task(bigint, integer) to authenticated;
