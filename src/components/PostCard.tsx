import { Link } from "@tanstack/react-router";
import { CalendarClock, Gift, MapPin, Star, Users } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { InterestButton } from "@/components/InterestButton";
import {
  CATEGORY_META,
  COMPENSATION_LABEL,
  GROUP_PREF_LABEL,
  LISTING_LABEL,
  formatPlanned,
  relativeTime,
} from "@/lib/campus";
import type { Chat, TaskWithPoster } from "@/lib/queries";
import { cn } from "@/lib/utils";

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg bg-surface px-2 py-1 text-xs font-medium text-surface-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Card for Sports, Hangouts and Student Hustles posts, with the request-to-join action. */
export function PostCard({
  task,
  userId,
  request,
}: {
  task: TaskWithPoster;
  userId: string;
  request: Chat | undefined;
}) {
  const meta = CATEGORY_META[task.category];
  const when = formatPlanned(task.planned_for);

  return (
    <article className="glass-card rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
            meta.chip,
          )}
        >
          {task.subcategory ?? meta.label}
        </span>
        {task.category === "Gigs" && task.compensation ? (
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
              task.compensation === "paid"
                ? "border-primary/40 text-primary"
                : task.compensation === "exchange"
                  ? "border-gigs/40 text-gigs"
                  : "border-border text-muted-foreground",
            )}
          >
            {COMPENSATION_LABEL[task.compensation]}
          </span>
        ) : null}
        <span className="ml-auto text-xs text-muted-foreground">{relativeTime(task.created_at)}</span>
      </div>

      <Link to="/task/$id" params={{ id: String(task.id) }} className="block">
        <h3 className="mt-3 text-base font-semibold leading-snug text-card-foreground">{task.title}</h3>
        {task.description ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{task.description}</p>
        ) : null}
      </Link>

      <div className="mt-3 flex flex-wrap gap-2">
        {task.category === "Gigs" && task.listing_type ? <Pill>{LISTING_LABEL[task.listing_type]}</Pill> : null}
        {when ? (
          <Pill>
            <CalendarClock className="size-3.5 text-primary" /> {when}
          </Pill>
        ) : null}
        {task.group_pref ? (
          <Pill>
            <Users className="size-3.5 text-primary" /> {GROUP_PREF_LABEL[task.group_pref]}
          </Pill>
        ) : null}
        {task.group_size && task.group_pref !== "partner" ? (
          <Pill>
            <Users className="size-3.5 text-primary" /> Up to {task.group_size}
          </Pill>
        ) : null}
        {task.location_note ? (
          <Pill>
            <MapPin className="size-3.5 text-primary" /> {task.location_note}
          </Pill>
        ) : null}
        {task.reward ? (
          <Pill>
            <Gift className="size-3.5 text-primary" /> {task.reward}
          </Pill>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
        <UserAvatar url={task.poster?.avatar_url} name={task.poster?.full_name} className="size-7 text-[10px]" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-xs font-semibold text-card-foreground">{task.poster?.full_name}</p>
          <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Star className="size-3 fill-primary text-primary" />
            {(task.poster?.rating ?? 5).toFixed(1)}
          </p>
        </div>
        <InterestButton
          taskId={task.id}
          isOwner={task.poster_id === userId}
          request={request}
          className="ml-auto"
        />
      </div>
    </article>
  );
}
