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
