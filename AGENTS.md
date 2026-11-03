<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Campus task notifications are fanned out by a database trigger on task insert (not app code), so the backend stays the source of truth.
- Theme is a class on <html> set by an inline head script from localStorage, mirrored to profiles.theme_pref, so there is no flash and it follows the user across devices.
- Profile pictures live in the private `avatars` bucket under `<user_id>/`; `profiles.avatar_url` stores the bucket path and every avatar renders through `UserAvatar` (signed URLs), so one record drives all screens and public buckets are not required.
- All homepage sections share the `tasks` table, split by `category` (Hustle = Campus Help, Playground = Sports, Lounge = Hangouts, Gigs = Student Hustles), so there is one task, reputation and moderation system.
- Request-based posts (every category except Hustle) go through `request_to_join` / `respond_to_request` / `withdraw_request` RPCs on `chats`; `can_message_chat` keeps messaging locked until a request is Accepted, so chat gating lives in the database, not the UI.
- Ended events are archived (not deleted) and restrictive policies block new participants/interests on non-live events, so past matches and messages survive.
- Approved student email domains are `public.is_college_domain()` (regex for .edu/.ac.xx plus an explicit extra list), enforced in `ensure_profile` and a BEFORE INSERT trigger on profiles; `EXTRA_COLLEGE_DOMAINS` in src/lib/campus.ts mirrors the extra list for form hints, so the database stays the gate.
