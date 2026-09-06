import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function RatingDialog({
  open,
  onOpenChange,
  taskId,
  reviewerId,
  revieweeId,
  revieweeName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  taskId: number;
  reviewerId: string;
  revieweeId: string;
  revieweeName: string;
}) {
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const queryClient = useQueryClient();

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ratings").insert({
        task_id: taskId,
        reviewer_id: reviewerId,
        reviewee_id: revieweeId,
        stars,
        comment: comment.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Thanks for the feedback!");
      onOpenChange(false);
    },
    onError: (err) =>
      toast.error(
        err instanceof Error && err.message.includes("duplicate")
          ? "You already rated this task."
          : "Could not save your rating",
      ),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[340px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Rate {revieweeName}</DialogTitle>
          <DialogDescription>
            Verified feedback — only people who finished a task together can rate.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-2 py-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setStars(n)} aria-label={`${n} stars`}>
              <Star
                className={cn(
                  "size-8 transition-transform active:scale-90",
                  n <= stars ? "fill-primary text-primary" : "text-muted-foreground",
                )}
              />
            </button>
          ))}
        </div>

        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="How did it go? (optional)"
          maxLength={300}
          rows={3}
        />

        <Button onClick={() => submit.mutate()} disabled={submit.isPending} size="lg">
          {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Submit rating
        </Button>
      </DialogContent>
    </Dialog>
  );
}
