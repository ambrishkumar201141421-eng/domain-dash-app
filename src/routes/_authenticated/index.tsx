import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Loader2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { TaskCard } from "@/components/TaskCard";
import { feedQuery } from "@/lib/queries";
import { CATEGORIES, CATEGORY_META, isLive } from "@/lib/campus";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Campus Hustle — live tasks on your campus" },
      {
        name: "description",
        content:
          "See live errands, sports partners and hangouts posted by verified students on your own campus, right now.",
      },
      { property: "og:title", content: "Campus Hustle — live tasks on your campus" },
      {
        property: "og:description",
        content: "Hustle, Playground and Lounge tasks from students at your college.",
      },
    ],
  }),
  component: Feed,
});

function Feed() {
  const { data, isLoading } = useQuery(feedQuery);
  const [tab, setTab] = useState<"All" | (typeof CATEGORIES)[number]>("All");
  const [q, setQ] = useState("");

  const tasks = useMemo(() => {
    const list = (data ?? []).filter(isLive);
    const needle = q.trim().toLowerCase();
    return list.filter(
      (t) =>
        (tab === "All" || t.category === tab) &&
        (!needle ||
          t.title.toLowerCase().includes(needle) ||
          (t.description ?? "").toLowerCase().includes(needle) ||
          t.reward.toLowerCase().includes(needle)),
    );
  }, [data, tab, q]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">What's live on campus</h1>
        <p className="text-sm text-muted-foreground">
          Only students from your college can see and take these.
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tasks, rewards…"
          className="pl-9"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["All", ...CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => setTab(c)}
            className={cn(
              "shrink-0 rounded-full border border-border px-3.5 py-1.5 text-sm font-semibold transition-colors",
              tab === c
                ? c === "All"
                  ? "border-primary bg-primary text-primary-foreground"
                  : cn(CATEGORY_META[c].chip, CATEGORY_META[c].ring)
                : "text-muted-foreground",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="glass-card grid place-items-center rounded-2xl px-6 py-14 text-center">
          <Sparkles className="size-6 text-primary" />
          <p className="mt-3 font-semibold">Nothing live right now</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Be the first to post a hustle, a game or a chai run.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </div>
      )}
    </div>
  );
}
