import { createFileRoute, Link } from "@tanstack/react-router";
import { UserAvatar } from "@/components/UserAvatar";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MessagesSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { myChatsQuery, type Chat } from "@/lib/queries";
import { CATEGORY_META, isRequestMode, relativeTime } from "@/lib/campus";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chats")({
  head: () => ({
    meta: [
      { title: "Your campus chats — Campus Hustle" },
      {
        name: "description",
        content: "Private text conversations and requests with the students you're helping, playing or hanging out with.",
      },
      { property: "og:title", content: "Your campus chats — Campus Hustle" },
      {
        property: "og:description",
        content: "All your task, activity and hangout conversations in one place on Campus Hustle.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChatsList,
});

type EventConnection = {
  id: number;
  from_user: string;
  to_user: string;
  created_at: string;
  from: { full_name: string; avatar_url: string | null } | null;
  to: { full_name: string; avatar_url: string | null } | null;
};

function statusLine(c: Chat, mine: boolean) {
  const requestMode = c.task ? isRequestMode(c.task.category) : false;
  if (!requestMode) return mine ? "Wants to help you" : "You offered to help";
  if (c.status === "Pending") return mine ? "Wants to join · tap to review" : "Request sent · waiting";
  if (c.status === "Accepted") return mine ? "Accepted · chat open" : "Accepted · chat open";
  if (c.status === "Declined") return "Declined";
  return "Withdrawn";
}

function ChatsList() {
  const { user } = Route.useRouteContext();
  const { data, isLoading } = useQuery(myChatsQuery(user.id));
  const { data: connections } = useQuery({
    queryKey: ["event-connections", user.id],
    queryFn: async (): Promise<EventConnection[]> => {
      const { data, error } = await supabase
        .from("event_interests")
        .select(
          "id, from_user, to_user, created_at, from:profiles!event_interests_from_user_fkey(full_name, avatar_url), to:profiles!event_interests_to_user_fkey(full_name, avatar_url)",
        )
        .eq("status", "accepted")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EventConnection[];
    },
  });

  if (isLoading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  const chats = (data ?? []).filter((c) => c.status !== "Withdrawn");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Chats & requests</h1>

      {chats.length === 0 ? (
        <div className="glass-card grid place-items-center rounded-2xl px-6 py-14 text-center">
          <MessagesSquare className="size-6 text-primary" />
          <p className="mt-3 font-semibold">No conversations yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Offer help on a task or tap “I'm Interested” on a post and it shows up here.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {chats.map((c) => {
            const mine = c.poster_id === user.id;
            const other = mine ? c.applicant : c.poster;
            const meta = c.task ? CATEGORY_META[c.task.category] : null;
            const pendingForMe = mine && c.status === "Pending" && c.task && isRequestMode(c.task.category);
            return (
              <li key={c.id}>
                <Link
                  to={pendingForMe ? "/task/$id" : "/chat/$id"}
                  params={{ id: String(pendingForMe ? c.task_id : c.id) }}
                  className="glass-card flex items-center gap-3 rounded-2xl p-3"
                >
                  <UserAvatar url={other?.avatar_url} name={other?.full_name} className="size-10 text-sm" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                      {other?.full_name}
                      {pendingForMe ? <span className="size-2 rounded-full bg-urgent" aria-label="Needs a reply" /> : null}
                    </p>
                    {c.task ? (
                      <p className="truncate text-xs">
                        <span className={cn("font-semibold", meta?.text)}>{meta?.label}</span>
                        <span className="text-muted-foreground"> · {c.task.title}</span>
                      </p>
                    ) : null}
                    <p className="truncate text-xs text-muted-foreground">{statusLine(c, mine)}</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground">{relativeTime(c.created_at)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {(connections ?? []).length > 0 ? (
        <div className="space-y-2">
          <h2 className="pt-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Event connections
          </h2>
          <ul className="space-y-2">
            {(connections ?? []).map((c) => {
              const other = c.from_user === user.id ? c.to : c.from;
              return (
                <li key={c.id}>
                  <Link
                    to="/connections/$id"
                    params={{ id: String(c.id) }}
                    className="glass-card flex items-center gap-3 rounded-2xl p-3"
                  >
                    <UserAvatar url={other?.avatar_url} name={other?.full_name} className="size-10 text-sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{other?.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground">Event match</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{relativeTime(c.created_at)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
