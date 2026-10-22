import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { notificationsQuery, markRead, browserAlertsSupported, type AppNotification } from "@/lib/notifications";
import { relativeTime } from "@/lib/campus";
import { cn } from "@/lib/utils";

export function NotificationBell({ userId, alertsOn }: { userId: string; alertsOn: boolean }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data = [] } = useQuery(notificationsQuery(userId));
  const unread = data.filter((n) => !n.is_read).length;

  useEffect(() => {
    const channel = supabase
      .channel(`notif-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["notifications", userId] });
          const n = payload.new as AppNotification;
          if (alertsOn && browserAlertsSupported() && Notification.permission === "granted") {
            const heading =
              n.type === "post_request"
                ? "New request on your post"
                : n.type === "request_accepted"
                  ? "Your request was accepted"
                  : "New post on your campus 🎯";
            const alert = new Notification(heading, {
              body: n.type === "campus_task" ? `${n.title}${n.reward ? ` · ${n.reward}` : ""}` : `${n.title} · ${n.message ?? ""}`,
              tag: `task-${n.task_id}`,
            });
            alert.onclick = () => {
              window.focus();
              void markRead([n.id]).then(() => qc.invalidateQueries({ queryKey: ["notifications", userId] }));
              if (n.task_id) navigate({ to: "/task/$id", params: { id: String(n.task_id) } });
              else if (n.type.startsWith("garba_")) navigate({ to: "/chats" });
            };
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, alertsOn, qc, navigate]);

  async function openOne(n: AppNotification) {
    setOpen(false);
    if (!n.is_read) {
      await markRead([n.id]);
      qc.invalidateQueries({ queryKey: ["notifications", userId] });
    }
    if (n.task_id) navigate({ to: "/task/$id", params: { id: String(n.task_id) } });
    else if (n.type.startsWith("garba_")) navigate({ to: "/chats" });
  }

  async function markAll() {
    await markRead(data.filter((n) => !n.is_read).map((n) => n.id));
    qc.invalidateQueries({ queryKey: ["notifications", userId] });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={unread ? `${unread} unread notifications` : "Notifications"}
          className="relative grid size-9 place-items-center rounded-full bg-surface text-muted-foreground transition-colors hover:text-foreground"
        >
          <Bell className="size-4" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-urgent px-1 text-[10px] font-bold leading-4 text-background">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="font-display text-sm font-bold">Notifications</p>
          {unread > 0 ? (
            <button onClick={markAll} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
              <CheckCheck className="size-3.5" /> Mark all as read
            </button>
          ) : null}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {data.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No notifications yet. Turn on campus task alerts in your profile.
            </p>
          ) : (
            data.map((n) => (
              <button
                key={n.id}
                onClick={() => openOne(n)}
                className={cn(
                  "flex w-full gap-2 border-b border-border px-3 py-2.5 text-left last:border-0 hover:bg-accent",
                  !n.is_read && "bg-surface",
                )}
              >
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.is_read ? "bg-transparent" : "bg-primary")} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] text-muted-foreground">New task posted on your campus</span>
                  <span className="block truncate text-sm font-semibold">{n.title}</span>
                  {n.message ? <span className="line-clamp-1 text-xs text-muted-foreground">{n.message}</span> : null}
                  <span className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
                    {n.reward ? <span className="font-medium text-primary">{n.reward}</span> : null}
                    <span>{n.campus}</span>
                    <span>{relativeTime(n.created_at)}</span>
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
