import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Star, GraduationCap, ShieldAlert } from "lucide-react";
import { TaskCard } from "@/components/TaskCard";
import { myProfileQuery, myTasksQuery, ratingsForQuery, isAdminQuery } from "@/lib/queries";
import { isLive, relativeTime } from "@/lib/campus";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your campus profile — Campus Hustle" },
      {
        name: "description",
        content:
          "Your star rating, verified college badge, active posts and completed task history on Campus Hustle.",
      },
      { property: "og:title", content: "Your campus profile — Campus Hustle" },
      {
        property: "og:description",
        content: "Track your reputation and task history across your campus.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = Route.useRouteContext();
  const fullName = (user.user_metadata?.["full_name"] as string) ?? "";
  const { data: profile } = useQuery(myProfileQuery(fullName));
  const { data: tasks, isLoading } = useQuery(myTasksQuery(user.id));
  const { data: reviews } = useQuery(ratingsForQuery(user.id));
  const { data: isAdmin } = useQuery(isAdminQuery(user.id));

  const all = tasks ?? [];
  const active = all.filter((t) => t.status === "Accepted" || isLive(t));
  const done = all.filter((t) => t.status === "Completed");

  return (
    <div className="space-y-5">
      <div className="glass-card rounded-2xl p-5 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-surface text-xl font-bold">
          {(profile?.full_name ?? "?").slice(0, 1).toUpperCase()}
        </span>
        <h1 className="mt-3 text-xl font-bold">{profile?.full_name}</h1>
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
          <GraduationCap className="size-3.5 text-primary" />
          {profile?.college_domain}
        </span>
        <div className="mt-3 flex items-center justify-center gap-1 text-sm">
          <Star className="size-4 fill-primary text-primary" />
          <span className="font-semibold">{(profile?.rating ?? 5).toFixed(1)}</span>
          <span className="text-muted-foreground">
            ({profile?.ratings_count ?? 0} review{(profile?.ratings_count ?? 0) === 1 ? "" : "s"})
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-surface py-2">
            <p className="font-bold">{active.length}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div className="rounded-xl bg-surface py-2">
            <p className="font-bold">{done.length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Active
            </h2>
            {active.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing running right now.</p>
            ) : (
              active.map((t) => <TaskCard key={t.id} task={t} />)
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              History
            </h2>
            {done.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed tasks yet.</p>
            ) : (
              done.map((t) => <TaskCard key={t.id} task={t} />)
            )}
          </section>

          {(reviews ?? []).length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Feedback
              </h2>
              {(reviews ?? []).map((r) => (
                <div key={r.id} className="glass-card rounded-2xl p-3">
                  <div className="flex items-center gap-1 text-sm">
                    {Array.from({ length: r.stars }).map((_, i) => (
                      <Star key={i} className="size-3.5 fill-primary text-primary" />
                    ))}
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {relativeTime(r.created_at)}
                    </span>
                  </div>
                  {r.comment ? <p className="mt-1 text-sm">{r.comment}</p> : null}
                </div>
              ))}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
