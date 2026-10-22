import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Chat } from "@/lib/queries";

function errMessage(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "message" in err) return String((err as { message: string }).message);
  return fallback;
}

/** "I'm Interested" — backend keeps it to one request per student per post. */
export function useRequestToJoin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: number) => {
      const { data, error } = await supabase.rpc("request_to_join", { p_task_id: taskId });
      if (error) throw error;
      return data as number;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chats"] });
      toast.success("Request sent. You'll be notified when they accept.");
    },
    onError: (e) => toast.error(errMessage(e, "Could not send your request")),
  });
}

export function useWithdrawRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (chatId: number) => {
      const { error } = await supabase.rpc("withdraw_request", { p_chat_id: chatId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chats"] });
      toast.success("Request withdrawn");
    },
    onError: (e) => toast.error(errMessage(e, "Could not withdraw")),
  });
}

export function useRespondToRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ chatId, accept }: { chatId: number; accept: boolean }) => {
      const { error } = await supabase.rpc("respond_to_request", { p_chat_id: chatId, p_accept: accept });
      if (error) throw error;
      return accept;
    },
    onSuccess: (accept) => {
      qc.invalidateQueries({ queryKey: ["chats"] });
      toast.success(accept ? "Accepted — your private chat is open" : "Request declined");
    },
    onError: (e) => toast.error(errMessage(e, "Could not update the request")),
  });
}

/** My own request on each post, keyed by post id. */
export function myRequestsByTask(chats: Chat[] | undefined, userId: string) {
  const map = new Map<number, Chat>();
  for (const c of chats ?? []) if (c.applicant_id === userId) map.set(c.task_id, c);
  return map;
}

export function reportListing(posterId: string, taskId: number, title: string, reason: string) {
  return supabase.rpc("report_student", {
    p_user_id: posterId,
    p_reason: `Listing #${taskId} "${title}": ${reason}`,
    p_context: "listing_report",
  });
}
