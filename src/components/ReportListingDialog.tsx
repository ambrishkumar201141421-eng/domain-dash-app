import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reportListing } from "@/lib/requests";

const REASONS = ["Misleading", "Inappropriate", "Prohibited or illegal", "Spam or scam"];

export function ReportListingDialog({
  posterId,
  taskId,
  title,
}: {
  posterId: string;
  taskId: number;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");

  const report = useMutation({
    mutationFn: async () => {
      const { error } = await reportListing(posterId, taskId, title, `${reason}. ${details.trim()}`);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thanks — our moderators will review this listing.");
      setOpen(false);
      setDetails("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not send the report"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="mx-auto flex items-center gap-1 py-2 text-xs font-semibold text-muted-foreground hover:text-urgent">
          <Flag className="size-3.5" /> Report this listing
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this listing</DialogTitle>
          <DialogDescription>
            Reports go privately to campus moderators. The poster isn't told who reported.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={reason === r}
              onClick={() => setReason(r)}
              className={
                reason === r
                  ? "rounded-full border border-primary bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                  : "rounded-full border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground"
              }
            >
              {r}
            </button>
          ))}
        </div>
        <Textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Anything moderators should know (optional)"
          maxLength={300}
          rows={3}
        />
        <Button onClick={() => report.mutate()} disabled={report.isPending}>
          {report.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Send report
        </Button>
      </DialogContent>
    </Dialog>
  );
}
