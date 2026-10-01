import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppNotification = {
  id: number;
  task_id: number | null;
  type: string;
  title: string;
  message: string | null;
  reward: string | null;
  campus: string;
  is_read: boolean;
  created_at: string;
};

export const notificationsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["notifications", userId],
    queryFn: async (): Promise<AppNotification[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, task_id, type, title, message, reward, campus, is_read, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

export async function markRead(ids: number[]) {
  if (ids.length === 0) return;
  const { error } = await supabase.from("notifications").update({ is_read: true }).in("id", ids);
  if (error) throw error;
}

export const browserAlertsSupported = () =>
  typeof window !== "undefined" && "Notification" in window;
