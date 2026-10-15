import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { connectionQuery, connectionMessagesQuery } from "@/lib/events";
import { relativeTime } from "@/lib/campus";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/connections/$id")({
  head: () => ({
    meta: [
      { title: "Connection chat — Campus Hustle" },
      { name: "description", content: "Private chat with your event connection." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConnectionChatPage,
});

function ConnectionChatPage() {
  const { id } = Route.useParams();
  const interestId = Number(id);
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const { data: conn, isLoading } = useQuery(connectionQuery(interestId));
  const { data: messages } = useQuery({
    ...connectionMessagesQuery(interestId),
    enabled: Boolean(conn && conn.status === "accepted"),
  });
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages?.length]);

  const send = useMutation({
    mutationFn: async (message: string) => {
      const { error } = await supabase.from("connection_messages").insert({
        interest_id: interestId,
        sender_id: user.id,
        message_text: message,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["connection-messages", interestId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Message didn't send"),
  });

  if (isLoading) {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  const isParty = conn && (conn.from_user === user.id || conn.to_user === user.id);
  if (!conn || !isParty || conn.status !== "accepted") {
    return (
      <div className="glass-card rounded-2xl px-6 py-14 text-center">
        <p className="font-semibold">This chat isn't available</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Chats open once both of you accept the connection.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/events">Back to events</Link>
        </Button>
      </div>
    );
  }

  const other = conn.from_user === user.id ? conn.to : conn.from;

  return (
    <div className="flex h-[calc(100dvh-11rem)] flex-col gap-3">
      <div className="flex items-center gap-2">
        <Link
          to="/events/$slug"
          params={{ slug: conn.event?.slug ?? "" }}
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {conn.event?.title ?? "Event"}
        </Link>
      </div>
      <h1 className="text-xl font-bold">{other?.full_name ?? "Your connection"}</h1>

      <div className="glass-card flex-1 space-y-3 overflow-y-auto rounded-2xl p-4">
        {(messages ?? []).length === 0 && (
          <p className="pt-8 text-center text-sm text-muted-foreground">
            Say hi and plan how you'll meet up.
          </p>
        )}
        {(messages ?? []).map((m) => {
          const mine = m.sender_id === user.id;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                  mine ? "bg-primary text-primary-foreground" : "bg-surface",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.message_text}</p>
                <p
                  className={cn(
                    "mt-0.5 text-[10px]",
                    mine ? "text-primary-foreground/70" : "text-muted-foreground",
                  )}
                >
                  {relativeTime(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const t = text.trim();
          if (t) send.mutate(t);
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          maxLength={1000}
          autoComplete="off"
        />
        <Button type="submit" size="icon" disabled={send.isPending || !text.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
