import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarDays, Loader2, MapPin, Plus, Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/TaskCard";
import { PostCard } from "@/components/PostCard";
import { EventImage } from "@/components/EventImage";
import { FindYourPeople, type PeopleTarget } from "@/components/FindYourPeople";
import { feedQuery, myChatsQuery, type TaskWithPoster } from "@/lib/queries";
import { publishedEventsQuery, formatEventDate } from "@/lib/events";
import { myRequestsByTask } from "@/lib/requests";
import {
  CATEGORY_META,
  COMPENSATION_LABEL,
  GROUP_PREF_LABEL,
  SUBCATEGORIES,
  TIME_SLOTS,
  isLive,
  isUpcomingEvent,
  timeSlotOf,
  type Category,
  type Compensation,
  type GroupPref,
  type TimeSlot,
} from "@/lib/campus";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Campus Hustle — help, sports, hangouts and gigs on your campus" },
      {
        name: "description",
        content:
          "Get a hand with errands, find sports partners, make hangout plans and put your skills to work with verified students from your own campus.",
      },
      { property: "og:title", content: "Campus Hustle — help, sports, hangouts and gigs on your campus" },
      {
        property: "og:description",
        content: "Campus Help, Sports & Activities, Hangouts & Plans and Student Hustles — only for your college.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const PAGE = 5;

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

function Chips<T extends string>({
  options,
  value,
  onChange,
  allLabel = "All",
  label,
  render,
}: {
  options: readonly T[];
  value: T | null;
  onChange: (v: T | null) => void;
  allLabel?: string;
  label: string;
  render?: (v: T) => string;
}) {
  return (
    <div role="group" aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {[null, ...options].map((o) => {
        const active = value === o;
        return (
          <button
            key={o ?? "all"}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {o === null ? allLabel : render ? render(o) : o}
          </button>
        );
      })}
    </div>
  );
}

function SectionHeader({
  id,
  category,
  title,
  subtitle,
  postLabel,
}: {
  id: string;
  category: Category;
  title: string;
  subtitle: string;
  postLabel: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 id={`${id}-title`} className={cn("text-xl font-bold", CATEGORY_META[category].text)}>
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <Button asChild size="sm" className="shrink-0">
        <Link to="/create" search={{ category }}>
          <Plus className="size-4" /> {postLabel}
        </Link>
      </Button>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="glass-card grid place-items-center rounded-2xl px-6 py-10 text-center">
      <Sparkles className="size-5 text-primary" />
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function Paged<T>({ items, render }: { items: T[]; render: (t: T) => React.ReactNode }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, PAGE);
  return (
    <div className="space-y-3">
      {shown.map(render)}
      {items.length > PAGE ? (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="w-full rounded-xl border border-border py-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          {all ? "Show less" : `Show all ${items.length}`}
        </button>
      ) : null}
    </div>
  );
}

function matches(t: TaskWithPoster, needle: string) {
  if (!needle) return true;
  return (
    t.title.toLowerCase().includes(needle) ||
    (t.description ?? "").toLowerCase().includes(needle) ||
    t.reward.toLowerCase().includes(needle) ||
    (t.subcategory ?? "").toLowerCase().includes(needle)
  );
}

function Home() {
  const { user } = Route.useRouteContext();
  const { data, isLoading } = useQuery(feedQuery);
  const { data: chats } = useQuery(myChatsQuery(user.id));
  const { data: events } = useQuery(publishedEventsQuery);
  const requests = useMemo(() => myRequestsByTask(chats, user.id), [chats, user.id]);

  const live = useMemo(() => (data ?? []).filter(isLive), [data]);
  const by = (c: Category) => live.filter((t) => t.category === c);

  // Campus Help
  const [helpQ, setHelpQ] = useState("");
  const [helpType, setHelpType] = useState<string | null>(null);
  // Sports
  const [sport, setSport] = useState<string | null>(null);
  const [sportTime, setSportTime] = useState<TimeSlot | null>(null);
  const [sportGroup, setSportGroup] = useState<GroupPref | null>(null);
  // Hangouts
  const [hangType, setHangType] = useState<string | null>(null);
  const [hangTime, setHangTime] = useState<TimeSlot | null>(null);
  // Student Hustles
  const [gigQ, setGigQ] = useState("");
  const [gigType, setGigType] = useState<string | null>(null);
  const [gigComp, setGigComp] = useState<Compensation | null>(null);

  const help = by("Hustle").filter(
    (t) => (!helpType || t.subcategory === helpType) && matches(t, helpQ.trim().toLowerCase()),
  );
  const sports = by("Playground").filter(
    (t) =>
      (!sport || t.subcategory === sport) &&
      (!sportTime || timeSlotOf(t.planned_for) === sportTime) &&
      (!sportGroup || t.group_pref === sportGroup || t.group_pref === "either"),
  );
  const hangouts = by("Lounge").filter(
    (t) => (!hangType || t.subcategory === hangType) && (!hangTime || timeSlotOf(t.planned_for) === hangTime),
  );
  const gigs = by("Gigs").filter(
    (t) =>
      (!gigType || t.subcategory === gigType) &&
      (!gigComp || t.compensation === gigComp) &&
      matches(t, gigQ.trim().toLowerCase()),
  );
  const upcoming = (events ?? []).filter(isUpcomingEvent);

  function onPeople(target: PeopleTarget) {
    if (target === "study") {
      setHangType("Study group");
      scrollToSection("hangouts");
      return;
    }
    if (target === "hangouts") setHangType(null);
    if (target === "sports") setSport(null);
    scrollToSection(target);
  }

  const loader = (
    <div className="grid place-items-center py-10">
      <Loader2 className="size-5 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-10">
      {/* 1. Welcome */}
      <div>
        <h1 className="text-2xl font-bold">What's happening on campus</h1>
        <p className="text-sm text-muted-foreground">
          Only verified students from your college can see and respond to these.
        </p>
      </div>

      {/* 2. Campus Help & Tasks */}
      <section id="help" aria-labelledby="help-title" className="scroll-mt-20 space-y-3">
        <SectionHeader
          id="help"
          category="Hustle"
          title="Campus Help & Tasks"
          subtitle="Need a hand? Find someone on campus."
          postLabel="Post a Task"
        />
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={helpQ}
            onChange={(e) => setHelpQ(e.target.value)}
            placeholder="Search tasks, rewards…"
            aria-label="Search campus tasks"
            className="pl-9"
          />
        </div>
        <Chips label="Task type" options={SUBCATEGORIES.Hustle} value={helpType} onChange={setHelpType} />
        {isLoading ? (
          loader
        ) : help.length === 0 ? (
          <Empty text="No open tasks match. Post one and a campus mate can offer help." />
        ) : (
          <Paged items={help} render={(t) => <TaskCard key={t.id} task={t} isMine={t.poster_id === user.id} />} />
        )}
      </section>

      {/* 3. Find Your People */}
      <FindYourPeople onSelect={onPeople} />

      {/* 4. Sports & Activities */}
      <section id="sports" aria-labelledby="sports-title" className="scroll-mt-20 space-y-3">
        <SectionHeader
          id="sports"
          category="Playground"
          title="Sports & Activities"
          subtitle="Find your people. Play your game."
          postLabel="Post"
        />
        <Chips label="Activity" options={SUBCATEGORIES.Playground} value={sport} onChange={setSport} />
        <Chips label="Preferred time" options={TIME_SLOTS} value={sportTime} onChange={setSportTime} allLabel="Any time" />
        <Chips
          label="Partner or group"
          options={["partner", "group"] as const}
          value={sportGroup as "partner" | "group" | null}
          onChange={setSportGroup}
          allLabel="Partner or group"
          render={(v) => GROUP_PREF_LABEL[v]}
        />
        {isLoading ? (
          loader
        ) : sports.length === 0 ? (
          <Empty text="No one's looking for a game yet. Post “Looking for a badminton partner this evening”." />
        ) : (
          <Paged
            items={sports}
            render={(t) => <PostCard key={t.id} task={t} userId={user.id} request={requests.get(t.id)} />}
          />
        )}
      </section>

      {/* 5. Hangouts & Plans */}
      <section id="hangouts" aria-labelledby="hangouts-title" className="scroll-mt-20 space-y-3">
        <SectionHeader
          id="hangouts"
          category="Lounge"
          title="Hangouts & Plans"
          subtitle="Make plans. Meet your campus people."
          postLabel="Make a plan"
        />
        <Chips label="Plan type" options={SUBCATEGORIES.Lounge} value={hangType} onChange={setHangType} />
        <Chips label="Preferred time" options={TIME_SLOTS} value={hangTime} onChange={setHangTime} allLabel="Any time" />
        {isLoading ? (
          loader
        ) : hangouts.length === 0 ? (
          <Empty text="No plans yet. Start a chai run, a movie outing or a study group." />
        ) : (
          <Paged
            items={hangouts}
            render={(t) => <PostCard key={t.id} task={t} userId={user.id} request={requests.get(t.id)} />}
          />
        )}
      </section>

      {/* 6. Student Hustles */}
      <section id="hustles" aria-labelledby="hustles-title" className="scroll-mt-20 space-y-3">
        <SectionHeader
          id="hustles"
          category="Gigs"
          title="Student Hustles"
          subtitle="Put your skills to work."
          postLabel="Post"
        />
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={gigQ}
            onChange={(e) => setGigQ(e.target.value)}
            placeholder="Search gigs and skills…"
            aria-label="Search student hustles"
            className="pl-9"
          />
        </div>
        <Chips label="Hustle type" options={SUBCATEGORIES.Gigs} value={gigType} onChange={setGigType} />
        <Chips
          label="Payment"
          options={["paid", "unpaid", "exchange"] as const}
          value={gigComp}
          onChange={setGigComp}
          allLabel="Any"
          render={(v) => COMPENSATION_LABEL[v]}
        />
        {isLoading ? (
          loader
        ) : gigs.length === 0 ? (
          <Empty text="No listings yet. Offer your skills or post a small gig — nothing here is promised earnings." />
        ) : (
          <Paged
            items={gigs}
            render={(t) => <PostCard key={t.id} task={t} userId={user.id} request={requests.get(t.id)} />}
          />
        )}
      </section>

      {/* 7. Events & Fests */}
      <section id="events" aria-labelledby="events-title" className="scroll-mt-20 space-y-3">
        <div>
          <h2 id="events-title" className="text-xl font-bold">
            Events & Fests
          </h2>
          <p className="text-sm text-muted-foreground">Upcoming events on your campus.</p>
        </div>
        {upcoming.length === 0 ? (
          <Empty text="No upcoming events right now. New events show up here once they're announced." />
        ) : (
          <div className="space-y-3">
            {upcoming.map((e) => {
              const date = formatEventDate(e);
              return (
                <article key={e.id} className="glass-card overflow-hidden rounded-2xl">
                  <div className="relative aspect-[16/9]">
                    <EventImage src={e.image_url} alt={e.image_alt ?? e.title} />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold">{e.headline ?? e.title}</h3>
                    {e.subtitle ? <p className="text-sm text-muted-foreground">{e.subtitle}</p> : null}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {date ? (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="size-3.5 text-primary" /> {date}
                        </span>
                      ) : null}
                      {e.venue ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5 text-primary" /> {e.venue}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
