import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MessagesSquare } from "lucide-react";
import { myChatsQuery } from "@/lib/queries";
import { relativeTime } from "@/lib/campus";

export const Route = createFileRoute("/_authenticated/chats")({
  head: () => ({
    meta: [
      { title: "Your campus chats — Campus Hustle" },
      {
        name: "description",
        content: "Private text conversations with the students you're helping or hanging out with.",
      },
      { property: "og:title", content: "Your campus chats — Campus Hustle" },
      {
        property: "og:description",
        content: "All your task conversations in one place on Campus Hustle.",
      },
    ],
  }),
  component: ChatsList,
});

function ChatsList() {
  const { user } = Route.useRouteContext();
  const { data, isLoading } = useQuery(myChatsQuery(user.id));

  if (isLoading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  const chats = data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Chats</h1>

      {chats.length === 0 ? (
        <div className="glass-card grid place-items-center rounded-2xl px-6 py-14 text-center">
          <MessagesSquare className="size-6 text-primary" />
          <p className="mt-3 font-semibold">No conversations yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Offer to help on a task and your chat shows up here.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {chats.map((c) => {
            const other = c.poster_id === user.id ? c.applicant : c.poster;
            return (
              <li key={c.id}>
                <Link
                  to="/chat/$id"
                  params={{ id: String(c.id) }}
                  className="glass-card flex items-center gap-3 rounded-2xl p-3"
                >
                  <span className="grid size-10 place-items-center rounded-full bg-surface text-sm font-bold">
                    {(other?.full_name ?? "?").slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{other?.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.poster_id === user.id ? "Wants to help you" : "You offered to help"} ·{" "}
                      {c.status}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {relativeTime(c.created_at)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
