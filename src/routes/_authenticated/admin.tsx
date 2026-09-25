import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { isAdminQuery, moderationQueueQuery } from "@/lib/queries";
import { reviewFlagChecked } from "@/lib/moderation.functions";
import { relativeTime } from "@/lib/campus";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Moderation queue — Campus Hustle" },
      {
        name: "description",
        content:
          "Review flagged campus posts, clear false alarms or permanently suspend students who broke the rules.",
      },
      { property: "og:title", content: "Moderation queue — Campus Hustle" },
      {
        property: "og:description",
        content: "Admin review of flagged Campus Hustle posts and account statuses.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const { data: isAdmin, isLoading: roleLoading } = useQuery(isAdminQuery(user.id));
  const { data: flags, isLoading } = useQuery({
    ...moderationQueueQuery,
    enabled: Boolean(isAdmin),
  });

  const review = useServerFn(reviewFlagChecked);
  const decide = useMutation({
    mutationFn: (vars: { flagId: number; guilty: boolean }) => review({ data: vars }),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries();
      toast.success(vars.guilty ? "Account permanently suspended" : "Student cleared");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save"),
  });

  if (roleLoading) {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="glass-card rounded-2xl px-6 py-14 text-center">
        <ShieldAlert className="mx-auto size-6 text-muted-foreground" />
        <p className="mt-3 font-semibold">Admins only</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This review queue isn't available on your account.
        </p>
      </div>
    );
  }

  const pending = (flags ?? []).filter((f) => f.review_status === "pending");
  const handled = (flags ?? []).filter((f) => f.review_status !== "pending");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Moderation queue</h1>
        <p className="text-sm text-muted-foreground">
          Flagged text is never posted. Finding a student guilty suspends them permanently.
        </p>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Awaiting review ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing to review right now.</p>
            ) : (
              pending.map((f) => (
                <div key={f.id} className="glass-card space-y-3 rounded-2xl p-4">
                  <div className="flex items-start gap-2">
                    <div>
                      <p className="font-semibold">{f.student?.full_name ?? "Student"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {f.student?.college_domain} · {relativeTime(f.created_at)}
                      </p>
                    </div>
                    <span className="ml-auto rounded-full bg-surface px-2 py-1 text-[11px] text-muted-foreground">
                      {f.context}
                    </span>
                  </div>
                  <p className="rounded-xl bg-surface p-3 text-sm">{f.content}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {f.matched_terms.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-urgent/15 px-2 py-0.5 text-[11px] font-medium text-urgent"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={decide.isPending}
                      onClick={() => decide.mutate({ flagId: f.id, guilty: false })}
                    >
                      <ShieldCheck className="size-4" />
                      Clear
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      disabled={decide.isPending}
                      onClick={() => decide.mutate({ flagId: f.id, guilty: true })}
                    >
                      <ShieldX className="size-4" />
                      Found guilty
                    </Button>
                  </div>
                </div>
              ))
            )}
          </section>

          {handled.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Decided
              </h2>
              {handled.map((f) => (
                <div key={f.id} className="glass-card rounded-2xl p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{f.student?.full_name ?? "Student"}</span>
                    <span
                      className={
                        "ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                        (f.review_status === "guilty"
                          ? "bg-urgent/15 text-urgent"
                          : "bg-surface text-muted-foreground")
                      }
                    >
                      {f.review_status === "guilty" ? "Permanently suspended" : "Cleared"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{f.content}</p>
                </div>
              ))}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
