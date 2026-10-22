import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { UserAvatar } from "@/components/UserAvatar";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  Clock,
  Gift,
  MapPin,
  Users,
  X,
  Hourglass,
  KeyRound,
  Loader2,
  MessageSquare,
  ShieldCheck,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RatingDialog } from "@/components/RatingDialog";
import { InterestButton } from "@/components/InterestButton";
import { ReportListingDialog } from "@/components/ReportListingDialog";
import {
  CATEGORY_META,
  COMPENSATION_LABEL,
  GROUP_PREF_LABEL,
  LISTING_LABEL,
  countdown,
  formatPlanned,
  isRequestMode,
  relativeTime,
  spotsLeft,
} from "@/lib/campus";
import { taskQuery, taskChatsQuery } from "@/lib/queries";
import { useRespondToRequest } from "@/lib/requests";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/task/$id")({
  head: () => ({
    meta: [
      { title: "Post details — Campus Hustle" },
      {
        name: "description",
        content:
          "Chat privately, agree on the reward and complete the handover with a secure 4-digit PIN.",
      },
      { property: "og:title", content: "Post details — Campus Hustle" },
      {
        property: "og:description",
        content: "Requests, private chat, secure handshake PIN and mutual ratings for a campus post.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TaskDetail,
});

function TaskDetail() {
  const { id } = Route.useParams();
  const taskId = Number(id);
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: task, isLoading } = useQuery(taskQuery(taskId));
  const isPoster = task?.poster_id === user.id;
  const isHelper = task?.helper_id === user.id;
  const { data: chats } = useQuery({ ...taskChatsQuery(taskId), enabled: !!task });

  const respond = useRespondToRequest();
  const [pinInput, setPinInput] = useState("");
  const [rateOpen, setRateOpen] = useState(false);

  const { data: pin } = useQuery({
    queryKey: ["pin", taskId],
    enabled: !!task && isPoster && task.status === "Accepted",
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_handshake_pin", { p_task_id: taskId });
      if (error) throw error;
      return data as number | null;
    },
  });

  const apply = useMutation({
    mutationFn: async () => {
      if (!task) return null;
      const existing = (chats ?? []).find((c) => c.applicant_id === user.id);
      if (existing) return existing.id;
      const { data, error } = await supabase
        .from("chats")
        .insert({ task_id: taskId, poster_id: task.poster_id, applicant_id: user.id })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (chatId) => {
      queryClient.invalidateQueries();
      if (chatId) navigate({ to: "/chat/$id", params: { id: String(chatId) } });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not start the chat"),
  });

  const cancel = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tasks").update({ status: "Cancelled" }).eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Post closed");
    },
  });

  const complete = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("complete_task", {
        p_task_id: taskId,
        p_pin: Number(pinInput),
      });
      if (error) throw error;
      return data as boolean;
    },
    onSuccess: (ok) => {
      if (!ok) {
        toast.error("That PIN doesn't match. Ask the poster again.");
        return;
      }
      queryClient.invalidateQueries();
      setPinInput("");
      toast.success("Handover confirmed — task completed!");
      setRateOpen(true);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not complete"),
  });

  if (isLoading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center">
        <p className="font-semibold">This task isn't available</p>
        <p className="mt-1 text-sm text-muted-foreground">
          It may have been removed, or it belongs to another campus.
        </p>
        <Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary">
          Back to feed
        </Link>
      </div>
    );
  }

  const meta = CATEGORY_META[task.category];
  const timer = countdown(task.expires_at);
  const myChat = (chats ?? []).find((c) => c.applicant_id === user.id);
  const counterpart = isPoster ? task.helper : task.poster;
  const requestMode = isRequestMode(task.category);
  const acceptedCount = (chats ?? []).filter((c) => c.status === "Accepted").length;
  const spots = spotsLeft(task.group_size, acceptedCount);
  const visibleRequests = (chats ?? []).filter((c) => c.status !== "Withdrawn");
  const when = formatPlanned(task.planned_for);

  return (
    <div className="space-y-4">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Feed
      </Link>

      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
              meta.chip,
            )}
          >
            {meta.label}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" /> {relativeTime(task.created_at)}
          </span>
        </div>

        <h1 className="mt-3 text-xl font-bold">{task.title}</h1>
        {task.description ? (
          <p className="mt-2 text-sm text-muted-foreground">{task.description}</p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          {task.subcategory ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-surface px-2 py-1 text-xs font-medium">
              {task.subcategory}
            </span>
          ) : null}
          {task.category === "Gigs" && task.listing_type ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-surface px-2 py-1 text-xs font-medium">
              {LISTING_LABEL[task.listing_type]}
            </span>
          ) : null}
          {task.compensation ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-surface px-2 py-1 text-xs font-semibold text-primary">
              {COMPENSATION_LABEL[task.compensation]}
            </span>
          ) : null}
          {task.reward ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-surface px-2 py-1 text-xs font-medium">
              <Gift className="size-3.5 text-primary" />
              {task.reward}
            </span>
          ) : null}
          {when ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-surface px-2 py-1 text-xs font-medium">
              <CalendarClock className="size-3.5 text-primary" /> {when}
            </span>
          ) : null}
          {task.group_pref ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-surface px-2 py-1 text-xs font-medium">
              <Users className="size-3.5 text-primary" /> {GROUP_PREF_LABEL[task.group_pref]}
            </span>
          ) : null}
          {task.group_size && task.group_pref !== "partner" ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-surface px-2 py-1 text-xs font-medium">
              <Users className="size-3.5 text-primary" /> Group of up to {task.group_size}
            </span>
          ) : null}
          {task.location_note ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-surface px-2 py-1 text-xs font-medium">
              <MapPin className="size-3.5 text-primary" /> {task.location_note}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1 rounded-lg bg-surface px-2 py-1 text-xs font-medium">
            {task.status}
          </span>
          {timer && task.status === "Open" ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-lg bg-surface px-2 py-1 text-xs font-semibold",
                timer.urgent ? "text-urgent" : "text-muted-foreground",
              )}
            >
              <Hourglass className="size-3.5" />
              {timer.label}
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-sm">
          <UserAvatar url={task.poster?.avatar_url} name={task.poster?.full_name} className="size-7 text-xs" />
          <span className="font-medium">{task.poster?.full_name}</span>
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="size-3.5 fill-primary text-primary" />
            {(task.poster?.rating ?? 5).toFixed(1)}
          </span>
        </div>
      </div>

      {/* Request-based posts: sports, hangouts, student hustles */}
      {requestMode && !isPoster && (task.status === "Open" || myChat?.status === "Accepted") ? (
        <div className="space-y-2">
          <InterestButton
            taskId={taskId}
            isOwner={false}
            request={myChat}
            size="lg"
            className="w-full justify-center"
          />
          <p className="text-center text-xs text-muted-foreground">
            {myChat?.status === "Accepted"
              ? "You're in. Sort out the details in your private chat."
              : "The private chat opens once the poster accepts your request."}
          </p>
        </div>
      ) : null}

      {/* Applicant actions */}
      {!requestMode && !isPoster && task.status === "Open" ? (
        <Button
          size="lg"
          className="w-full"
          onClick={() => (myChat ? navigate({ to: "/chat/$id", params: { id: String(myChat.id) } }) : apply.mutate())}
          disabled={apply.isPending}
        >
          {apply.isPending ? <Loader2 className="size-4 animate-spin" /> : <MessageSquare className="size-4" />}
          {myChat ? "Open your chat" : "Offer to help"}
        </Button>
      ) : null}

      {/* Poster: incoming requests for request-based posts */}
      {isPoster && requestMode ? (
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Requests
            </h2>
            {spots !== null ? (
              <span className="text-xs font-semibold text-primary">
                {spots === 0 ? "Group full" : `${spots} spot${spots === 1 ? "" : "s"} left`}
              </span>
            ) : null}
          </div>
          {visibleRequests.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No requests yet. You'll get a notification when someone's interested.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {visibleRequests.map((c) => (
                <li key={c.id} className="flex items-center gap-2 rounded-xl bg-surface p-3">
                  <UserAvatar url={c.applicant?.avatar_url} name={c.applicant?.full_name} className="size-9 text-xs" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.applicant?.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      ★ {(c.applicant?.rating ?? 5).toFixed(1)} · {c.status === "Pending" ? "Wants to join" : c.status}
                    </p>
                  </div>
                  <div className="ml-auto flex shrink-0 gap-1.5">
                    {c.status === "Pending" ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => respond.mutate({ chatId: c.id, accept: true })}
                          disabled={respond.isPending || spots === 0 || task.status !== "Open"}
                          aria-label={`Accept ${c.applicant?.full_name ?? "request"}`}
                        >
                          <Check className="size-4" /> Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => respond.mutate({ chatId: c.id, accept: false })}
                          disabled={respond.isPending}
                          aria-label={`Decline ${c.applicant?.full_name ?? "request"}`}
                        >
                          <X className="size-4" />
                        </Button>
                      </>
                    ) : c.status === "Accepted" ? (
                      <Link
                        to="/chat/$id"
                        params={{ id: String(c.id) }}
                        className="rounded-lg bg-card px-3 py-1.5 text-xs font-semibold text-primary"
                      >
                        Chat
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {task.category === "Gigs" && task.listing_type === "request" && task.status === "Open" ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Once you've chatted, confirm your helper from the chat to get the handover PIN and ratings.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Poster: applicants list */}
      {isPoster && !requestMode ? (
        <div className="glass-card rounded-2xl p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Applicants
          </h2>
          {(chats ?? []).length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No one has offered to help yet. Sit tight.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {(chats ?? []).map((c) => (
                <li key={c.id} className="flex items-center gap-2 rounded-xl bg-surface p-3">
                  <UserAvatar url={c.applicant?.avatar_url} name={c.applicant?.full_name} className="size-8 text-xs" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.applicant?.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      ★ {(c.applicant?.rating ?? 5).toFixed(1)} · {c.status}
                    </p>
                  </div>
                  <Link
                    to="/chat/$id"
                    params={{ id: String(c.id) }}
                    className="ml-auto rounded-lg bg-card px-3 py-1.5 text-xs font-semibold text-primary"
                  >
                    Chat
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {/* Secure handshake */}
      {task.status === "Accepted" && isPoster ? (
        <div className="glass-card rounded-2xl border-primary/40 p-4 text-center">
          <ShieldCheck className="mx-auto size-6 text-primary" />
          <p className="mt-2 text-sm font-semibold">Secure handshake PIN</p>
          <p className="text-xs text-muted-foreground">
            Share this with your helper face-to-face at handover — never in chat.
          </p>
          <p className="mt-3 font-display text-4xl font-bold tracking-[0.4em] text-primary">
            {pin ?? "····"}
          </p>
        </div>
      ) : null}

      {task.status === "Accepted" && isHelper ? (
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" />
            <p className="text-sm font-semibold">Enter the handover PIN</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Ask the poster for their 4-digit PIN once the job is done.
          </p>
          <div className="mt-3 flex gap-2">
            <Input
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              placeholder="1234"
              className="text-center text-lg tracking-[0.4em]"
            />
            <Button
              onClick={() => complete.mutate()}
              disabled={pinInput.length !== 4 || complete.isPending}
            >
              {complete.isPending ? <Loader2 className="size-4 animate-spin" /> : "Confirm"}
            </Button>
          </div>
        </div>
      ) : null}

      {task.status === "Completed" && (isPoster || isHelper) && counterpart ? (
        <Button variant="secondary" size="lg" className="w-full" onClick={() => setRateOpen(true)}>
          <Star className="size-4" /> Rate {counterpart.full_name}
        </Button>
      ) : null}

      {isPoster && (task.status === "Open" || task.status === "Accepted") ? (
        <button
          onClick={() => cancel.mutate()}
          className="w-full py-2 text-center text-sm font-semibold text-urgent"
        >
          {requestMode ? "Close this post" : "Cancel this task"}
        </button>
      ) : null}

      {!isPoster ? <ReportListingDialog posterId={task.poster_id} taskId={taskId} title={task.title} /> : null}

      {counterpart ? (
        <RatingDialog
          open={rateOpen}
          onOpenChange={setRateOpen}
          taskId={taskId}
          reviewerId={user.id}
          revieweeId={counterpart.id}
          revieweeName={counterpart.full_name}
        />
      ) : null}
    </div>
  );
}
