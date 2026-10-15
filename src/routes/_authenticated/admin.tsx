import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { CalendarPlus, Loader2, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { isAdminQuery, moderationQueueQuery } from "@/lib/queries";
import { reviewFlagChecked } from "@/lib/moderation.functions";
import { relativeTime } from "@/lib/campus";
import {
  allEventsAdminQuery,
  EVENT_CATEGORIES,
  ART_BUCKET,
  type CampusEvent,
  type EventCategory,
} from "@/lib/events";

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

      <EventsAdmin />
    </div>
  );
}

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function EventsAdmin() {
  const queryClient = useQueryClient();
  const { data: events, isLoading } = useQuery(allEventsAdminQuery);
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<EventCategory>("Festive");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [ctaLabel, setCtaLabel] = useState("Find a Partner");
  const [featured, setFeatured] = useState(false);
  const [official, setOfficial] = useState(true);
  const [partnerFinder, setPartnerFinder] = useState(true);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["events"] });

  const create = useMutation({
    mutationFn: async () => {
      let imageUrl: string | null = null;
      const file = fileRef.current?.files?.[0];
      const baseSlug = slugify(title) || `event-${Date.now()}`;
      if (file) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${baseSlug}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(ART_BUCKET)
          .upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        imageUrl = `${ART_BUCKET}/${path}`;
      }
      const { error } = await supabase.from("events").insert({
        slug: `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`,
        title: title.trim(),
        category,
        headline: headline.trim() || null,
        description: description.trim() || null,
        venue: venue.trim() || null,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        cta_label: ctaLabel.trim() || "Learn More",
        image_url: imageUrl,
        is_featured: featured,
        is_official: official,
        partner_finder: partnerFinder,
        status: "published",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setTitle("");
      setHeadline("");
      setDescription("");
      setVenue("");
      setStartsAt("");
      setEndsAt("");
      setFeatured(false);
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Event published");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create event"),
  });

  const setStatus = useMutation({
    mutationFn: async (vars: { id: number; status: CampusEvent["status"] }) => {
      const { error } = await supabase
        .from("events")
        .update({ status: vars.status })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update event"),
  });

  const toggleFeatured = useMutation({
    mutationFn: async (vars: { id: number; is_featured: boolean }) => {
      const { error } = await supabase
        .from("events")
        .update({ is_featured: vars.is_featured })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update event"),
  });

  return (
    <section className="space-y-4 border-t border-border pt-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <CalendarPlus className="size-5 text-primary" /> Events
        </h2>
        <p className="text-sm text-muted-foreground">
          Publish campus events. Featured ones appear in the home carousel.
        </p>
      </div>

      <div className="glass-card space-y-3 rounded-2xl p-4">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event title"
          maxLength={120}
        />
        <div className="flex flex-wrap gap-1.5">
          {EVENT_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors " +
                (category === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground")
              }
            >
              {c}
            </button>
          ))}
        </div>
        <Input
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="Headline (optional)"
          maxLength={160}
        />
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          rows={3}
          maxLength={1000}
        />
        <Input
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          placeholder="Venue (optional)"
          maxLength={120}
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-xs text-muted-foreground">
            Starts
            <Input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            Ends
            <Input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </label>
        </div>
        <Input
          value={ctaLabel}
          onChange={(e) => setCtaLabel(e.target.value)}
          placeholder="Button label"
          maxLength={40}
        />
        <label className="block space-y-1 text-xs text-muted-foreground">
          Artwork (optional)
          <input ref={fileRef} type="file" accept="image/*" className="block w-full text-sm" />
        </label>
        <div className="flex flex-wrap gap-4 text-sm">
          {(
            [
              ["Featured (carousel)", featured, setFeatured],
              ["Official", official, setOfficial],
              ["Partner finder", partnerFinder, setPartnerFinder],
            ] as const
          ).map(([label, value, setter]) => (
            <label key={label} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => setter(e.target.checked)}
                className="size-4 accent-primary"
              />
              {label}
            </label>
          ))}
        </div>
        <Button
          className="w-full"
          disabled={create.isPending || !title.trim()}
          onClick={() => create.mutate()}
        >
          {create.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Publish event
        </Button>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-8">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-2">
          {(events ?? []).map((e) => (
            <div key={e.id} className="glass-card flex items-center gap-3 rounded-2xl p-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{e.title}</p>
                <p className="text-xs text-muted-foreground">
                  {e.category} · {e.status}
                  {e.is_featured ? " · featured" : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={toggleFeatured.isPending}
                onClick={() => toggleFeatured.mutate({ id: e.id, is_featured: !e.is_featured })}
              >
                {e.is_featured ? "Unfeature" : "Feature"}
              </Button>
              <Button
                size="sm"
                variant={e.status === "published" ? "destructive" : "outline"}
                disabled={setStatus.isPending}
                onClick={() =>
                  setStatus.mutate({
                    id: e.id,
                    status: e.status === "published" ? "archived" : "published",
                  })
                }
              >
                {e.status === "published" ? "Archive" : "Publish"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
