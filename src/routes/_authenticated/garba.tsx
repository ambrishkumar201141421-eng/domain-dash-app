import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Check, Heart, Loader2, LogOut, MessagesSquare, Search, ShieldCheck, Users, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GarbaBanner, GARBA_COPY } from "@/components/GarbaBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  COLLEGE_YEARS,
  GARBA_SLUG,
  GROUP_PREFS,
  LOOKING_LABEL,
  eventBySlugQuery,
  myInterestsQuery,
  participantsQuery,
  type Participant,
} from "@/lib/events";
import { collegeQuery, myProfileQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/UserAvatar";

const INTRO_MAX = 160;
type Year = (typeof COLLEGE_YEARS)[number];
type Pref = (typeof GROUP_PREFS)[number];

export const Route = createFileRoute("/_authenticated/garba")({
  head: () => ({
    meta: [
      { title: "Garba Night (ended) — Campus Hustle" },
      { name: "description", content: GARBA_COPY },
      { property: "og:title", content: "Garba Night — Find Your Garba Partner" },
      { property: "og:description", content: GARBA_COPY },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GarbaPage,
});

function Avatar({ url, name, size = "size-12" }: { url?: string | null | undefined; name: string; size?: string }) {
  return <UserAvatar url={url} name={name} className={size} />;
}

function GarbaPage() {
  const { user } = Route.useRouteContext();
  const fullName = (user.user_metadata?.["full_name"] as string) ?? "";
  const { data: profile } = useQuery(myProfileQuery(fullName));
  const { data: college } = useQuery(collegeQuery(profile?.college_domain));
  const { data: event, isLoading } = useQuery(eventBySlugQuery(GARBA_SLUG));
  const campus = college?.short_name ?? profile?.college_domain ?? "your campus";

  if (isLoading) return <Loader2 className="mx-auto mt-16 size-5 animate-spin text-primary" />;

  if (!event) {
    return (
      <div className="glass-card space-y-3 rounded-2xl p-6 text-center">
        <p className="font-display text-lg font-bold">Garba Night has ended</p>
        <p className="text-sm text-muted-foreground">
          Thanks for joining in! New sign-ups and partner requests are closed. Your matches and
          conversations are still saved in Chats.
        </p>
        <div className="flex justify-center gap-2 pt-1">
          <Button asChild size="sm">
            <Link to="/chats">Open my chats</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <GarbaBanner compact />
      <p className="text-sm leading-relaxed text-muted-foreground">{GARBA_COPY}</p>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-4 text-primary" /> Only verified students from {campus} can see you here. Emails
        and phone numbers are never shown.
      </p>
      {event ? (
        <PartnerFinder eventId={event.id} userId={user.id} me={profile} campus={campus} />
      ) : (
        <div className="glass-card rounded-2xl p-6 text-center text-sm text-muted-foreground">
          Garba Night partner finding isn't open right now. Check back soon.
        </div>
      )}
    </div>
  );
}

function PartnerFinder({
  eventId,
  userId,
  me: profile,
  campus,
}: {
  eventId: number;
  userId: string;
  me: { full_name: string; avatar_url: string | null } | undefined;
  campus: string;
}) {
  const qc = useQueryClient();
  const { data: participants, isLoading } = useQuery(participantsQuery(eventId));
  const { data: interests } = useQuery(myInterestsQuery(eventId));
  const [editing, setEditing] = useState(false);
  const [q, setQ] = useState("");
  const [year, setYear] = useState<Year | "All">("All");
  const [pref, setPref] = useState<Pref | "All">("All");

  const mine = (participants ?? []).find((p) => p.user_id === userId);
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["participants", eventId] });
    qc.invalidateQueries({ queryKey: ["interests", eventId] });
  };

  useEffect(() => {
    if (window.location.hash === "#join") document.getElementById("join")?.scrollIntoView({ behavior: "smooth" });
  }, [isLoading]);

  const linkWith = (otherId: string) =>
    (interests ?? []).find(
      (i) => (i.from_user === userId && i.to_user === otherId) || (i.from_user === otherId && i.to_user === userId),
    );
  const participantOf = (id: string) => (participants ?? []).find((p) => p.user_id === id);
  const nameOf = (id: string) => participantOf(id)?.student?.full_name ?? "A student";
  const incoming = (interests ?? []).filter((i) => i.to_user === userId && i.status === "pending");
  const accepted = (interests ?? []).filter((i) => i.status === "accepted");

  const others = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const compatible = (p: Participant) =>
      !mine || mine.group_pref === "Open to Either" || p.group_pref === "Open to Either" || p.group_pref === mine.group_pref;
    return (participants ?? [])
      .filter((p) => p.user_id !== userId)
      .filter((p) => year === "All" || p.college_year === year)
      .filter((p) => pref === "All" || p.group_pref === pref)
      .filter(
        (p) =>
          !needle ||
          (p.student?.full_name ?? "").toLowerCase().includes(needle) ||
          (p.intro ?? "").toLowerCase().includes(needle),
      )
      .sort((a, b) => Number(compatible(b)) - Number(compatible(a)));
  }, [participants, userId, year, pref, q, mine]);

  const connect = useMutation({
    mutationFn: async (toUser: string) => {
      const { error } = await supabase.from("event_interests").insert({ event_id: eventId, from_user: userId, to_user: toUser });
      if (error) throw new Error(error.code === "23505" ? "You've already sent interest" : error.message);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Interest sent — they can accept or decline");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not send interest"),
  });

  const respond = useMutation({
    mutationFn: async (v: { id: number; status: "accepted" | "declined" }) => {
      const { error } = await supabase.from("event_interests").update({ status: v.status }).eq("id", v.id).eq("to_user", userId).eq("status", "pending");
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      invalidate();
      toast.success(v.status === "accepted" ? "It's a match! You can now chat." : "Request declined");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update"),
  });

  const cancel = useMutation({
    mutationFn: async (interestId: number) => {
      const { error } = await supabase
        .from("event_interests")
        .delete()
        .eq("id", interestId)
        .eq("from_user", userId)
        .eq("status", "pending");
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Request cancelled");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not cancel"),
  });

  const leave = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("event_participants").delete().eq("event_id", eventId).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("You've left Garba Night");
    },
  });

  if (isLoading) return <Loader2 className="mx-auto size-5 animate-spin text-primary" />;
  const displayName = profile?.full_name || "Student";

  return (
    <div className="space-y-6">
      <section id="join" className="scroll-mt-20">
        {!mine || editing ? (
          <JoinForm
            eventId={eventId}
            userId={userId}
            existing={mine}
            name={displayName}
            avatar={profile?.avatar_url ?? null}
            campus={campus}
            onDone={() => {
              setEditing(false);
              invalidate();
            }}
            onCancel={mine ? () => setEditing(false) : undefined}
          />
        ) : (
          <div className="glass-card space-y-3 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <Avatar url={profile?.avatar_url} name={displayName} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">You've joined Garba Night</p>
                <p className="truncate font-semibold">{displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {mine.college_year ?? "Year not set"} · Looking for {LOOKING_LABEL[mine.group_pref].toLowerCase()}
                </p>
              </div>
            </div>
            {mine.intro && <p className="text-sm text-muted-foreground">“{mine.intro}”</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setEditing(true)}>
                Update My Preferences
              </Button>
              <Button size="sm" variant="outline" disabled={leave.isPending} onClick={() => leave.mutate()}>
                <LogOut className="size-4" /> Leave
              </Button>
            </div>
          </div>
        )}
      </section>

      {incoming.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Interest Requests
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{incoming.length}</span>
          </h2>
          {incoming.map((i) => {
            const p = participantOf(i.from_user);
            const name = p?.student?.full_name || "A student";
            return (
              <div key={i.id} className="glass-card space-y-3 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <Avatar url={p?.student?.avatar_url} name={name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p?.college_year ?? "Year not set"} · {campus}
                    </p>
                  </div>
                </div>
                {p && (
                  <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {LOOKING_LABEL[p.group_pref]}
                  </span>
                )}
                {p?.intro && <p className="text-sm text-muted-foreground">“{p.intro}”</p>}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={respond.isPending}
                    onClick={() => respond.mutate({ id: i.id, status: "accepted" })}
                  >
                    {respond.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    disabled={respond.isPending}
                    onClick={() => respond.mutate({ id: i.id, status: "declined" })}
                  >
                    <X className="size-4" /> Decline
                  </Button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {accepted.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            My Matches / My Chats ({accepted.length})
          </h2>
          {accepted.map((i) => (
            <Link
              key={i.id}
              to="/connections/$id"
              params={{ id: String(i.id) }}
              className="glass-card flex items-center gap-3 rounded-2xl p-3 transition hover:border-primary/40"
            >
              <Avatar url={participantOf(i.from_user === userId ? i.to_user : i.from_user)?.student?.avatar_url} name={nameOf(i.from_user === userId ? i.to_user : i.from_user)} size="size-10" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{nameOf(i.from_user === userId ? i.to_user : i.from_user)}</p>
                <p className="text-xs text-muted-foreground">Tap to open your private chat</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                <MessagesSquare className="size-4" /> Chat Now
              </span>
            </Link>
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Users className="size-5 text-primary" /> Students joining
        </h2>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or intro…" className="pl-9" />
        </div>
        <Chips label="Year" value={year} options={["All", ...COLLEGE_YEARS]} onChange={setYear} />
        <Chips
          label="Looking for"
          value={pref}
          options={["All", ...GROUP_PREFS]}
          render={(o) => (o === "All" ? "All" : o === "Partner" ? "Partner" : o === "Small Group" ? "Group" : "Both")}
          onChange={setPref}
        />

        {others.length === 0 ? (
          <div className="glass-card rounded-2xl px-6 py-10 text-center">
            <p className="font-semibold">
              {(participants ?? []).some((p) => p.user_id !== userId) ? "No one matches these filters" : "No one has joined yet"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Join first and invite your classmates from {campus} — the more, the merrier!
            </p>
          </div>
        ) : (
          others.map((p) => {
            const link = linkWith(p.user_id);
            const name = p.student?.full_name || "Student";
            return (
              <div key={p.id} className="glass-card space-y-2 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <Avatar url={p.student?.avatar_url} name={name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{name}</p>
                    <p className="text-xs text-muted-foreground">{campus}</p>
                  </div>
                  {link ? (
                    link.status === "pending" && link.from_user === userId ? (
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                          Request Sent
                        </span>
                        <button
                          type="button"
                          disabled={cancel.isPending}
                          onClick={() => cancel.mutate(link.id)}
                          className="text-xs font-semibold text-muted-foreground underline-offset-2 hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : link.status === "pending" ? (
                      <div className="flex shrink-0 gap-1.5">
                        <Button size="sm" disabled={respond.isPending} onClick={() => respond.mutate({ id: link.id, status: "accepted" })}>
                          <Check className="size-4" /> Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label="Decline"
                          disabled={respond.isPending}
                          onClick={() => respond.mutate({ id: link.id, status: "declined" })}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ) : link.status === "accepted" ? (
                      <Link
                        to="/connections/$id"
                        params={{ id: String(link.id) }}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                      >
                        <MessagesSquare className="size-4" /> Chat Now
                      </Link>
                    ) : (
                      <span className="shrink-0 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                        Declined
                      </span>
                    )
                  ) : (
                    <Button
                      size="sm"
                      disabled={connect.isPending && connect.variables === p.user_id}
                      onClick={() =>
                        mine
                          ? connect.mutate(p.user_id)
                          : (toast.info("Join Garba Night first so they can see who you are"),
                            document.getElementById("join")?.scrollIntoView({ behavior: "smooth" }))
                      }
                    >
                      {connect.isPending && connect.variables === p.user_id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Heart className="size-4 fill-current" />
                      )}
                      I'm Interested
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {p.college_year && (
                    <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium">{p.college_year}</span>
                  )}
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {LOOKING_LABEL[p.group_pref]}
                  </span>
                </div>
                {p.intro && <p className="text-sm text-muted-foreground">{p.intro}</p>}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}

function Chips<T extends string>({
  label,
  value,
  options,
  onChange,
  render = (o) => o,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  render?: (o: T) => string;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1" role="group" aria-label={label}>
      <span className="shrink-0 text-xs font-semibold text-muted-foreground">{label}</span>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          onClick={() => onChange(o)}
          className={cn(
            "shrink-0 rounded-full border border-border px-3 py-1 text-xs font-semibold transition-colors",
            value === o ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground",
          )}
        >
          {render(o)}
        </button>
      ))}
    </div>
  );
}

function JoinForm({
  eventId,
  userId,
  existing,
  name,
  avatar,
  campus,
  onDone,
  onCancel,
}: {
  eventId: number;
  userId: string;
  existing: Participant | undefined;
  name: string;
  avatar: string | null;
  campus: string;
  onDone: () => void;
  onCancel?: (() => void) | undefined;
}) {
  const [year, setYear] = useState<Year | null>(existing?.college_year ?? null);
  const [pref, setPref] = useState<Pref | null>(existing?.group_pref ?? null);
  const [intro, setIntro] = useState(existing?.intro ?? "");

  const save = useMutation({
    mutationFn: async () => {
      if (!year || !pref) throw new Error("Pick your year and what you're looking for");
      const fields = { college_year: year, group_pref: pref, intro: intro.trim().slice(0, INTRO_MAX) || null };
      // One record per student per event (unique on event + student); edits update it in place.
      const { error } = existing
        ? await supabase.from("event_participants").update(fields).eq("id", existing.id).eq("user_id", userId)
        : await supabase.from("event_participants").insert({ event_id: eventId, user_id: userId, ...fields });
      if (error) throw new Error(error.code === "23505" ? "You've already joined — update your preferences instead" : error.message);
    },
    onSuccess: () => {
      toast.success(existing ? "Preferences updated" : "You've joined Garba Night!");
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const card = (active: boolean) =>
    cn(
      "rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-colors",
      active ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:border-primary/40",
    );

  return (
    <form
      className="glass-card space-y-4 rounded-2xl p-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <p className="font-semibold">{existing ? "Update My Preferences" : "Join Garba Night"}</p>
      <div className="flex items-center gap-3 rounded-xl bg-surface p-3">
        <Avatar url={avatar} name={name} size="size-10" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">{campus} · from your profile</p>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Which year are you in?</legend>
        <div className="grid grid-cols-3 gap-2">
          {COLLEGE_YEARS.map((y) => (
            <button key={y} type="button" aria-pressed={year === y} onClick={() => setYear(y)} className={card(year === y)}>
              {y}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">What are you looking for?</legend>
        <div className="grid gap-2">
          {GROUP_PREFS.map((g) => (
            <button key={g} type="button" aria-pressed={pref === g} onClick={() => setPref(g)} className={card(pref === g)}>
              {LOOKING_LABEL[g]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor="garba-intro" className="text-sm font-semibold">
          Short introduction <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          id="garba-intro"
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          placeholder="Beginner at Garba, looking for friendly people to dance with."
          maxLength={INTRO_MAX}
          rows={2}
        />
        <p className="text-right text-xs text-muted-foreground">
          {intro.length}/{INTRO_MAX}
        </p>
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={save.isPending || !year || !pref}>
          {save.isPending && <Loader2 className="size-4 animate-spin" />}
          {existing ? "Save Preferences" : "Find Your Partner"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
