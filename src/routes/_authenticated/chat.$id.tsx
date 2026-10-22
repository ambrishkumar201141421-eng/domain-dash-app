import { createFileRoute, Link } from "@tanstack/react-router";
import { UserAvatar } from "@/components/UserAvatar";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Loader2, Lock, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chatQuery, messagesQuery, taskQuery } from "@/lib/queries";
import { isRequestMode, relativeTime } from "@/lib/campus";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat/$id")({
  head: () => ({
    meta: [
      { title: "Private chat — Campus Hustle" },
      {
        name: "description",
        content: "A text-only private chat tied to one campus task, between the poster and helper.",
      },
      { property: "og:title", content: "Private chat — Campus Hustle" },
      {
        property: "og:description",
        content: "Agree on the details, then complete the handover with a 4-digit PIN.",
      },
    ],
  }),
  component: ChatRoom,
});

function ChatRoom() {
  const { id } = Route.useParams();
  const chatId = Number(id);
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: chat, isLoading } = useQuery(chatQuery(chatId));
  const { data: messages } = useQuery({ ...messagesQuery(chatId), enabled: !!chat });
  const { data: task } = useQuery({ ...taskQuery(chat?.task_id ?? 0), enabled: !!chat });

  useEffect(() => {
    const channel = supabase
      .channel(`chat-${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        () => queryClient.invalidateQueries({ queryKey: ["messages", chatId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const send = useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase
        .from("messages")
        .insert({ chat_id: chatId, sender_id: user.id, message_text: body });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
    },
    onError: () => toast.error("Message not sent"),
  });

  const accept = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("accept_applicant", { p_chat_id: chatId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Accepted — your handshake PIN is on the task page.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not accept"),
  });

  if (isLoading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center">
        <p className="font-semibold">Chat not found</p>
        <Link to="/chats" className="mt-3 inline-block text-sm font-semibold text-primary">
          Back to chats
        </Link>
      </div>
    );
  }

  const isPoster = chat.poster_id === user.id;
  const other = isPoster ? chat.applicant : chat.poster;
  const requestMode = task ? isRequestMode(task.category) : false;
  const locked = requestMode && chat.status !== "Accepted";
  const canPickHelper =
    isPoster &&
    task?.status === "Open" &&
    (task.category === "Hustle" ||
      (task.category === "Gigs" && task.listing_type !== "offer" && chat.status === "Accepted"));

  return (
    <div className="flex min-h-[calc(100vh-9rem)] flex-col">
      <div className="flex items-center gap-2">
        <Link to="/chats" className="text-muted-foreground">
          <ArrowLeft className="size-4" />
        </Link>
        <UserAvatar url={other?.avatar_url} name={other?.full_name} className="size-9 text-sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{other?.full_name}</p>
          {task ? (
            <Link
              to="/task/$id"
              params={{ id: String(task.id) }}
              className="truncate text-xs text-primary"
            >
              {task.title}
            </Link>
          ) : null}
        </div>
      </div>

      {canPickHelper ? (
        <Button className="mt-3" onClick={() => accept.mutate()} disabled={accept.isPending}>
          {accept.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Accept {other?.full_name} for this task
        </Button>
      ) : null}

      {task?.status === "Accepted" && (task.helper_id === chat.applicant_id) ? (
        <Link
          to="/task/$id"
          params={{ id: String(task.id) }}
          className="mt-3 flex items-center gap-2 rounded-xl bg-surface p-3 text-xs text-muted-foreground"
        >
          <ShieldCheck className="size-4 text-primary" />
          {isPoster
            ? "Accepted. Show your 4-digit PIN at handover — open the task page."
            : "Accepted. Enter the poster's 4-digit PIN on the task page when you're done."}
        </Link>
      ) : null}

      <div className="mt-4 flex-1 space-y-2 overflow-y-auto pb-2">
        {(messages ?? []).length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Say hi and sort out the details. Text only, keep it quick.
          </p>
        ) : null}
        {(messages ?? []).map((m) => {
          const mine = m.sender_id === user.id;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                  mine
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm bg-card text-card-foreground",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.message_text}</p>
                <p className={cn("mt-1 text-[10px]", mine ? "opacity-70" : "text-muted-foreground")}>
                  {relativeTime(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {locked ? (
        <div className="sticky bottom-20 flex items-center gap-2 rounded-xl bg-surface p-3 text-xs text-muted-foreground">
          <Lock className="size-4 shrink-0 text-primary" />
          {chat.status === "Pending"
            ? isPoster
              ? "Accept this request on the post page to open the chat."
              : "Chat opens once the poster accepts your request."
            : "This request is closed, so the chat is locked."}
        </div>
      ) : (
      <form
        className="sticky bottom-20 flex gap-2 bg-background pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          const body = text.trim();
          if (!body) return;
          send.mutate(body);
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          maxLength={1000}
        />
        <Button type="submit" size="icon" disabled={send.isPending || !text.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
      )}
    </div>
  );
}
