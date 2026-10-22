import { Link } from "@tanstack/react-router";
import { UserAvatar } from "@/components/UserAvatar";
import { ArrowRight, Clock, Gift, Star, Hourglass } from "lucide-react";
import { CATEGORY_META, countdown, relativeTime } from "@/lib/campus";
import type { TaskWithPoster } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function TaskCard({ task, isMine }: { task: TaskWithPoster; isMine?: boolean }) {
  const meta = CATEGORY_META[task.category];
  const timer = task.status === "Open" ? countdown(task.expires_at) : null;

  return (
    <Link
      to="/task/$id"
      params={{ id: String(task.id) }}
      className="glass-card block rounded-2xl p-4 transition-transform active:scale-[0.99]"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
            meta.chip,
          )}
        >
          {task.subcategory ?? meta.label}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3.5" />
          {relativeTime(task.created_at)}
        </span>
      </div>

      <h3 className="mt-3 text-base font-semibold leading-snug text-card-foreground">
        {task.title}
      </h3>
      {task.description ? (
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{task.description}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {task.reward ? (
          <span className="inline-flex items-center gap-1 rounded-lg bg-surface px-2 py-1 text-xs font-medium text-surface-foreground">
            <Gift className="size-3.5 text-primary" />
            {task.reward}
          </span>
        ) : null}
        {timer ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold",
              timer.urgent ? "bg-surface text-urgent" : "bg-surface text-muted-foreground",
            )}
          >
            <Hourglass className="size-3.5" />
            {timer.label}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
        <UserAvatar url={task.poster?.avatar_url} name={task.poster?.full_name} className="size-6 text-[10px]" />
        <span className="font-medium text-card-foreground">{task.poster?.full_name}</span>
        <span className="inline-flex items-center gap-1">
          <Star className="size-3.5 fill-primary text-primary" />
          {(task.poster?.rating ?? 5).toFixed(1)}
        </span>
        {task.status === "Open" ? (
          <span className="ml-auto inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
            {isMine ? "View" : "Offer help"} <ArrowRight className="size-3.5" />
          </span>
        ) : null}
      </div>
    </Link>
  );
}
