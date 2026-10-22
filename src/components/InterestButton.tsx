import { Link } from "@tanstack/react-router";
import { Check, Heart, Loader2, MessageSquare, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Chat } from "@/lib/queries";
import { useRequestToJoin, useWithdrawRequest } from "@/lib/requests";
import { cn } from "@/lib/utils";

export function InterestButton({
  taskId,
  isOwner,
  request,
  size = "sm",
  className,
}: {
  taskId: number;
  isOwner: boolean;
  request: Chat | undefined;
  size?: "sm" | "lg";
  className?: string;
}) {
  const join = useRequestToJoin();
  const withdraw = useWithdrawRequest();

  if (isOwner) {
    return (
      <Button asChild size={size} variant="secondary" className={className}>
        <Link to="/task/$id" params={{ id: String(taskId) }}>
          <Settings2 className="size-4" /> Manage requests
        </Link>
      </Button>
    );
  }

  if (request?.status === "Accepted") {
    return (
      <Button asChild size={size} className={className}>
        <Link to="/chat/$id" params={{ id: String(request.id) }}>
          <MessageSquare className="size-4" /> Chat now
        </Link>
      </Button>
    );
  }

  if (request?.status === "Pending") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className="inline-flex items-center gap-1 rounded-lg bg-surface px-2.5 py-1.5 text-xs font-semibold text-muted-foreground">
          <Check className="size-3.5 text-primary" /> Request sent
        </span>
        <button
          type="button"
          onClick={() => withdraw.mutate(request.id)}
          disabled={withdraw.isPending}
          className="text-xs font-semibold text-muted-foreground underline-offset-2 hover:underline"
        >
          {withdraw.isPending ? "…" : "Withdraw"}
        </button>
      </div>
    );
  }

  if (request?.status === "Declined") {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-lg bg-surface px-2.5 py-1.5 text-xs font-medium text-muted-foreground",
          className,
        )}
      >
        Not this time
      </span>
    );
  }

  return (
    <Button
      size={size}
      className={className}
      onClick={() => join.mutate(taskId)}
      disabled={join.isPending}
    >
      {join.isPending ? <Loader2 className="size-4 animate-spin" /> : <Heart className="size-4" />}
      I'm Interested
    </Button>
  );
}
