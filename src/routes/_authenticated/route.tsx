import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, LogOut, GraduationCap, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { myProfileQuery, collegeQuery } from "@/lib/queries";
import { restrictionMessage } from "@/lib/moderation";
import { BottomNav } from "@/components/BottomNav";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getStoredTheme, setStoredTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    return { user: data.user };
  },
  component: AuthedShell,
});

function AuthedShell() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fullName = (user.user_metadata?.["full_name"] as string) ?? "";
  const { data: profile, isLoading, error } = useQuery(myProfileQuery(fullName));
  const { data: college } = useQuery(collegeQuery(profile?.college_domain));
  const savedTheme = profile?.theme_pref;

  // Carry the student's saved theme across devices and sign-ins.
  useEffect(() => {
    if (savedTheme && savedTheme !== "system" && savedTheme !== getStoredTheme()) {
      setStoredTheme(savedTheme);
    }
  }, [savedTheme]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto grid min-h-screen max-w-md place-items-center px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold">Campus check failed</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "We couldn't verify your college account."}
          </p>
          <button onClick={signOut} className="mt-5 text-sm font-semibold text-primary">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const restriction = restrictionMessage(profile.status, profile.suspended_until);
  if (restriction) {
    return (
      <div className="mx-auto grid min-h-screen max-w-md place-items-center px-6 text-center">
        <div>
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-urgent/15 text-urgent">
            <ShieldAlert className="size-7" />
          </span>
          <h1 className="mt-4 text-xl font-bold">
            {profile.status === "permanently_banned" ? "Account suspended" : "Account under review"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{restriction}</p>
          <button onClick={signOut} className="mt-6 text-sm font-semibold text-primary">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">

      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-3">
          <GraduationCap className="size-5 text-primary" />
          <div className="leading-tight">
            <p className="font-display text-sm font-bold">Campus Hustle</p>
            <p className="text-[11px] text-muted-foreground">{profile.college_domain}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell userId={user.id} alertsOn={Boolean(profile.notify_campus_tasks)} />
            <ThemeToggle userId={user.id} />
            <button
              onClick={signOut}
              aria-label="Sign out"
              className="grid size-9 place-items-center rounded-full bg-surface text-muted-foreground"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-md px-4 py-4">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
