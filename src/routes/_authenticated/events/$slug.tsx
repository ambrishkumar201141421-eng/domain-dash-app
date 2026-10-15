import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Heart,
  Loader2,
  MapPin,
  MessagesSquare,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EventImage } from "@/components/EventImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  eventBySlugQuery,
  participantsQuery,
  myInterestsQuery,
  formatEventDate,
  EXPERIENCE,
  GROUP_PREFS,
  CATEGORY_LABEL,
  type Participant,
} from "@/lib/events";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/events/$slug")({
  head: () => ({
    meta: [
      { title: "Event — Campus Hustle" },
      { name: "description", content: "Event details and partner finder on Campus Hustle." },
      { property: "og:title", content: "Event — Campus Hustle" },
      { property: "og:description", content: "Event details and partner finder on Campus Hustle." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EventDetailPage,
});

function EventDetailPage() {
  const { slug } = Route.useParams();
  const { user } = Route.useRouteContext();
  const { data: event, isLoading } = useQuery(eventBySlugQuery(slug));

  if (isLoading) {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }
  if (!event) {
    return (
      <div className="glass-card rounded-2xl px-6 py-14 text-center">
        <p className="font-semibold">This event isn't available</p>
        <p className="mt-1 text-sm text-muted-foreground">It may have ended or been taken down.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/events">Back to events</Link>
        </Button>
      </div>
    );
  }

  const date = formatEventDate(event);

  return (
    <div className="space-y-5">
      <Link
        to="/events"
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All events
      </Link>

      <div className="glass-card overflow-hidden rounded-3xl">
        <div className="relative aspect-[16/9]">
          <EventImage src={event.image_url} alt={event.image_alt ?? event.title} eager />
        </div>
        <div className="space-y-3 p-5">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
              {CATEGORY_LABEL[event.category]}
            </span>
            <span className="rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              {event.is_official ? "Official event" : "Community activity"}
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold uppercase leading-none tracking-tight">
            {event.title}
          </h1>
          {event.headline && <p className="text-lg font-semibold">{event.headline}</p>}
          {event.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">{event.description}</p>
          )}
          <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            {date && (
              <p className="flex items-center gap-2">
                <CalendarDays className="size-4 text-primary" /> {date}
              </p>
            )}
            {event.venue && (
              <p className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" /> {event.venue}
              </p>
            )}
          </div>
        </div>
      </div>

      {event.partner_finder && <PartnerFinder eventId={event.id} userId={user.id} />}
    </div>
  );
}

function PartnerFinder({ eventId, userId }: { eventId: number; userId: string }) {
  const queryClient = useQueryClient();
  const { data: participants, isLoading } = useQuery(participantsQuery(eventId));
  const { data: interests } = useQuery(myInterestsQuery(eventId));

  const me = (participants ?? []).find((p) => p.user_id === userId);
  const others = (participants ?? []).filter((p) => p.user_id !== userId);

  const interestTo = (otherId: string) =>
    (interests ?? []).find(
      (i) =>
        (i.from_user === userId && i.to_user === otherId) ||
        (i.from_user === otherId && i.to_user === userId),
    );

  const incoming = (interests ?? []).filter(
    (i) => i.to_user === userId && i.status === "pending",
  );
  const accepted = (interests ?? []).filter((i) => i.status === "accepted");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["participants", eventId] });
    queryClient.invalidateQueries({ queryKey: ["interests", eventId] });
  };

  const connect = useMutation({
    mutationFn: async (toUser: string) => {
      const { error } = await supabase
        .from("event_interests")
        .insert({ event_id: eventId, from_user: userId, to_user: toUser });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Interest sent — they'll see you want to connect");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not send interest"),
  });

  const respond = useMutation({
    mutationFn: async (vars: { id: number; status: "accepted" | "declined" }) => {
      const { error } = await supabase
        .from("event_interests")
        .update({ status: vars.status })
        .eq("id", vars.id)
        .eq("to_user", userId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      invalidate();
      toast.success(vars.status === "accepted" ? "Connected! You can now chat." : "Declined");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update"),
  });

  return (
    <section className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Users className="size-5 text-primary" /> Partner finder
        </h2>
        <p className="text-sm text-muted-foreground">
          Join in, see who else is going from your campus, and connect.
        </p>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : !me ? (
        <JoinForm eventId={eventId} userId={userId} onJoined={invalidate} />
      ) : (
        <>
          <div className="glass-card rounded-2xl p-4">
            <p className="text-sm font-semibold text-primary">You're in!</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {me.experience} · {me.group_pref}
              {me.availability ? ` · ${me.availability}` : ""}
            </p>
          </div>

          {incoming.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Wants to connect ({incoming.length})
              </h3>
              {incoming.map((i) => {
                const from = (participants ?? []).find((p) => p.user_id === i.from_user);
                return (
                  <div key={i.id} className="glass-card flex items-center gap-3 rounded-2xl p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {from?.student?.full_name ?? "A student"}
                      </p>
                      {from?.intro && (
                        <p className="truncate text-xs text-muted-foreground">{from.intro}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      disabled={respond.isPending}
                      onClick={() => respond.mutate({ id: i.id, status: "accepted" })}
                    >
                      <Check className="size-4" /> Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={respond.isPending}
                      onClick={() => respond.mutate({ id: i.id, status: "declined" })}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {accepted.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Your connections
              </h3>
              {accepted.map((i) => {
                const otherId = i.from_user === userId ? i.to_user : i.from_user;
                const other = (participants ?? []).find((p) => p.user_id === otherId);
                return (
                  <Link
                    key={i.id}
                    to="/connections/$id"
                    params={{ id: String(i.id) }}
                    className="glass-card flex items-center gap-3 rounded-2xl p-3 transition hover:border-primary/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {other?.student?.full_name ?? "A student"}
                      </p>
                      <p className="text-xs text-muted-foreground">Tap to open your chat</p>
                    </div>
                    <MessagesSquare className="size-5 text-primary" />
                  </Link>
                );
              })}
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Also going ({others.length})
            </h3>
            {others.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You're the first from your campus — check back soon.
              </p>
            ) : (
              others.map((p) => (
                <ParticipantCard
                  key={p.id}
                  p={p}
                  interest={interestTo(p.user_id)}
                  onConnect={() => connect.mutate(p.user_id)}
                  pending={connect.isPending}
                />
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}

function ParticipantCard({
  p,
  interest,
  onConnect,
  pending,
}: {
  p: Participant;
  interest: { status: string } | undefined;
  onConnect: () => void;
  pending: boolean;
}) {
  return (
    <div className="glass-card flex items-center gap-3 rounded-2xl p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{p.student?.full_name ?? "A student"}</p>
        <p className="text-xs text-muted-foreground">
          {p.experience} · {p.group_pref}
          {p.availability ? ` · ${p.availability}` : ""}
        </p>
        {p.intro && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.intro}</p>}
      </div>
      {interest?.status === "accepted" ? (
        <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
          Connected
        </span>
      ) : interest?.status === "pending" ? (
        <span className="rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground">
          Pending
        </span>
      ) : interest?.status === "declined" ? (
        <span className="rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground">
          Declined
        </span>
      ) : (
        <Button size="sm" variant="outline" disabled={pending} onClick={onConnect}>
          <Heart className="size-4" /> Connect
        </Button>
      )}
    </div>
  );
}

function JoinForm({
  eventId,
  userId,
  onJoined,
}: {
  eventId: number;
  userId: string;
  onJoined: () => void;
}) {
  const [experience, setExperience] = useState<(typeof EXPERIENCE)[number]>("Beginner");
  const [groupPref, setGroupPref] = useState<(typeof GROUP_PREFS)[number]>("Open to Either");
  const [availability, setAvailability] = useState("");
  const [intro, setIntro] = useState("");

  const join = useMutation({
    mutationFn: async () => {
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("college_domain")
        .eq("id", userId)
        .single();
      if (pErr) throw pErr;
      const { error } = await supabase.from("event_participants").insert({
        event_id: eventId,
        user_id: userId,
        college_domain: profile.college_domain,
        experience,
        group_pref: groupPref,
        availability: availability.trim() || null,
        intro: intro.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      onJoined();
      toast.success("You're on the list!");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not join"),
  });

  return (
    <div className="glass-card space-y-4 rounded-2xl p-4">
      <p className="font-semibold">Join the partner finder</p>

      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Your experience
        </p>
        <div className="flex flex-wrap gap-1.5">
          {EXPERIENCE.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setExperience(e)}
              className={cn(
                "rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition-colors",
                experience === e
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-muted-foreground",
              )}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Looking for
        </p>
        <div className="flex flex-wrap gap-1.5">
          {GROUP_PREFS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGroupPref(g)}
              className={cn(
                "rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition-colors",
                groupPref === g
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-muted-foreground",
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <Input
        value={availability}
        onChange={(e) => setAvailability(e.target.value)}
        placeholder="When are you free? (e.g. evenings after 6)"
        maxLength={120}
      />
      <Textarea
        value={intro}
        onChange={(e) => setIntro(e.target.value)}
        placeholder="Say hi — a line about you (optional)"
        maxLength={280}
        rows={2}
      />

      <Button className="w-full" disabled={join.isPending} onClick={() => join.mutate()}>
        {join.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        Count me in
      </Button>
    </div>
  );
}
