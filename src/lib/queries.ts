import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AccountStatus = "active" | "in_verification" | "permanently_banned";

export type Profile = {
  id: string;
  full_name: string;
  college_domain: string;
  rating: number;
  ratings_count: number;
  avatar_url: string | null;
  status?: AccountStatus;
  suspended_until?: string | null;
};

export type Task = {
  id: number;
  poster_id: string;
  title: string;
  description: string | null;
  category: "Hustle" | "Playground" | "Lounge";
  reward: string;
  status: "Open" | "Accepted" | "Completed" | "Expired" | "Cancelled";
  helper_id: string | null;
  created_at: string;
  expires_at: string | null;
  accepted_at: string | null;
  completed_at: string | null;
};

export type TaskWithPoster = Task & { poster: Profile | null; helper: Profile | null };

const TASK_COLUMNS =
  "id, poster_id, title, description, category, reward, status, helper_id, created_at, expires_at, accepted_at, completed_at, poster:profiles!tasks_poster_id_fkey(id, full_name, college_domain, rating, ratings_count, avatar_url), helper:profiles!tasks_helper_id_fkey(id, full_name, college_domain, rating, ratings_count, avatar_url)";

export const myProfileQuery = (fullName: string) =>
  queryOptions({
    queryKey: ["profile", "me"],
    queryFn: async (): Promise<Profile> => {
      // Let a lapsed 30-day review window clear itself before reading standing.
      await supabase.rpc("expire_verification");
      const { data, error } = await supabase.rpc("ensure_profile", { p_full_name: fullName });
      if (error) throw error;
      return data as unknown as Profile;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

export const isAdminQuery = (userId: string) =>
  queryOptions({
    queryKey: ["role", "admin", userId],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (error) throw error;
      return Boolean(data);
    },
    staleTime: 5 * 60_000,
  });

export type ModerationFlag = {
  id: number;
  user_id: string;
  content: string;
  matched_terms: string[];
  context: string;
  review_status: "pending" | "guilty" | "cleared";
  created_at: string;
  reviewed_at: string | null;
  student: Profile | null;
};

export const moderationQueueQuery = queryOptions({
  queryKey: ["moderation", "queue"],
  queryFn: async (): Promise<ModerationFlag[]> => {
    const { data, error } = await supabase
      .from("moderation_flags")
      .select(
        "id, user_id, content, matched_terms, context, review_status, created_at, reviewed_at, student:profiles!moderation_flags_user_id_fkey(id, full_name, college_domain, rating, ratings_count, avatar_url, status, suspended_until)",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data ?? []) as unknown as ModerationFlag[];
  },
});

export const feedQuery = queryOptions({
  queryKey: ["tasks", "feed"],
  queryFn: async (): Promise<TaskWithPoster[]> => {
    const { data, error } = await supabase
      .from("tasks")
      .select(TASK_COLUMNS)
      .eq("status", "Open")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data ?? []) as unknown as TaskWithPoster[];
  },
  refetchInterval: 30_000,
});

export const taskQuery = (id: number) =>
  queryOptions({
    queryKey: ["task", id],
    queryFn: async (): Promise<TaskWithPoster | null> => {
      const { data, error } = await supabase
        .from("tasks")
        .select(TASK_COLUMNS)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as TaskWithPoster | null;
    },
  });

export const myTasksQuery = (userId: string) =>
  queryOptions({
    queryKey: ["tasks", "mine", userId],
    queryFn: async (): Promise<TaskWithPoster[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select(TASK_COLUMNS)
        .or(`poster_id.eq.${userId},helper_id.eq.${userId}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TaskWithPoster[];
    },
  });

export type Chat = {
  id: number;
  task_id: number;
  poster_id: string;
  applicant_id: string;
  status: string;
  created_at: string;
  applicant: Profile | null;
  poster: Profile | null;
};

const CHAT_COLUMNS =
  "id, task_id, poster_id, applicant_id, status, created_at, applicant:profiles!chats_applicant_id_fkey(id, full_name, college_domain, rating, ratings_count, avatar_url), poster:profiles!chats_poster_id_fkey(id, full_name, college_domain, rating, ratings_count, avatar_url)";

export const taskChatsQuery = (taskId: number) =>
  queryOptions({
    queryKey: ["chats", "task", taskId],
    queryFn: async (): Promise<Chat[]> => {
      const { data, error } = await supabase
        .from("chats")
        .select(CHAT_COLUMNS)
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Chat[];
    },
  });

export const myChatsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["chats", "mine", userId],
    queryFn: async (): Promise<Chat[]> => {
      const { data, error } = await supabase
        .from("chats")
        .select(CHAT_COLUMNS)
        .or(`poster_id.eq.${userId},applicant_id.eq.${userId}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Chat[];
    },
  });

export const chatQuery = (chatId: number) =>
  queryOptions({
    queryKey: ["chat", chatId],
    queryFn: async (): Promise<Chat | null> => {
      const { data, error } = await supabase
        .from("chats")
        .select(CHAT_COLUMNS)
        .eq("id", chatId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as Chat | null;
    },
  });

export type Message = {
  id: number;
  chat_id: number;
  sender_id: string;
  message_text: string;
  created_at: string;
};

export const messagesQuery = (chatId: number) =>
  queryOptions({
    queryKey: ["messages", chatId],
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, chat_id, sender_id, message_text, created_at")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Message[];
    },
  });

export const ratingsForQuery = (userId: string) =>
  queryOptions({
    queryKey: ["ratings", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ratings")
        .select("id, task_id, reviewer_id, reviewee_id, stars, comment, created_at")
        .eq("reviewee_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
