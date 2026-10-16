import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/queries";

export const EVENT_CATEGORIES = ["Festive", "College Fest", "Music", "Sports", "Outdoor"] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];
export const CATEGORY_LABEL: Record<EventCategory, string> = {
  Festive: "Festive Events",
  "College Fest": "College Fests",
  Music: "Music",
  Sports: "Sports",
  Outdoor: "Outdoor Activities",
};

export const EXPERIENCE = ["Beginner", "Intermediate", "Experienced", "Just Here to Have Fun"] as const;
export const GROUP_PREFS = ["Partner", "Small Group", "Open to Either"] as const;
export const COLLEGE_YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Other"] as const;
export const LOOKING_LABEL: Record<(typeof GROUP_PREFS)[number], string> = {
  Partner: "A Garba Partner",
  "Small Group": "A Group to Dance With",
  "Open to Either": "Both — Partner or Group",
};
export const GARBA_SLUG = "garba-night";
export const ART_BUCKET = "event-art";

export type CampusEvent = {
  id: number;
  slug: string;
  title: string;
  headline: string | null;
  subtitle: string | null;
  description: string | null;
  category: EventCategory;
  image_url: string | null;
  image_alt: string | null;
  cta_label: string;
  cta_path: string | null;
  starts_at: string | null;
  ends_at: string | null;
  venue: string | null;
  campus_domain: string | null;
  status: "draft" | "published" | "archived";
  is_featured: boolean;
  is_official: boolean;
  partner_finder: boolean;
  display_order: number;
  publish_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export type Participant = {
  id: number;
  event_id: number;
  user_id: string;
  college_domain: string;
  experience: (typeof EXPERIENCE)[number];
  group_pref: (typeof GROUP_PREFS)[number];
  availability: string | null;
  college_year: (typeof COLLEGE_YEARS)[number] | null;
  intro: string | null;
  created_at: string;
  student: Pick<Profile, "id" | "full_name" | "avatar_url" | "rating" | "ratings_count"> | null;
};

export type Interest = {
  id: number;
  event_id: number;
  from_user: string;
  to_user: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
};

const EVENT_COLS =
  "id, slug, title, headline, subtitle, description, category, image_url, image_alt, cta_label, cta_path, starts_at, ends_at, venue, campus_domain, status, is_featured, is_official, partner_finder, display_order, publish_at, expires_at, created_at";

/** RLS already hides drafts, archived, scheduled and expired events from students. */
function isLiveEvent(e: CampusEvent) {
  const now = Date.now();
  return (
    e.status === "published" &&
    (!e.publish_at || new Date(e.publish_at).getTime() <= now) &&
    (!e.expires_at || new Date(e.expires_at).getTime() > now)
  );
}

export const publishedEventsQuery = queryOptions({
  queryKey: ["events", "published"],
  queryFn: async (): Promise<CampusEvent[]> => {
    const { data, error } = await supabase
      .from("events")
      .select(EVENT_COLS)
      .eq("status", "published")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as unknown as CampusEvent[]).filter(isLiveEvent);
  },
  staleTime: 60_000,
});

export const allEventsAdminQuery = queryOptions({
  queryKey: ["events", "admin"],
  queryFn: async (): Promise<CampusEvent[]> => {
    const { data, error } = await supabase
      .from("events")
      .select(EVENT_COLS)
      .order("display_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as CampusEvent[];
  },
});

export const eventBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["events", "slug", slug],
    queryFn: async (): Promise<CampusEvent | null> => {
      const { data, error } = await supabase
        .from("events")
        .select(EVENT_COLS)
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      const e = (data ?? null) as unknown as CampusEvent | null;
      return e && isLiveEvent(e) ? e : null;
    },
  });

export const participantsQuery = (eventId: number) =>
  queryOptions({
    queryKey: ["participants", eventId],
    queryFn: async (): Promise<Participant[]> => {
      const { data, error } = await supabase
        .from("event_participants")
        .select(
          "id, event_id, user_id, college_domain, experience, group_pref, availability, college_year, intro, created_at, student:profiles!event_participants_user_id_fkey(id, full_name, avatar_url, rating, ratings_count)",
        )
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Participant[];
    },
  });

export const myInterestsQuery = (eventId: number) =>
  queryOptions({
    queryKey: ["interests", eventId],
    queryFn: async (): Promise<Interest[]> => {
      const { data, error } = await supabase
        .from("event_interests")
        .select("id, event_id, from_user, to_user, status, created_at")
        .eq("event_id", eventId);
      if (error) throw error;
      return (data ?? []) as Interest[];
    },
    refetchInterval: 20_000,
  });

export type Connection = Interest & {
  event: { slug: string; title: string } | null;
  from: { id: string; full_name: string } | null;
  to: { id: string; full_name: string } | null;
};

export const connectionQuery = (id: number) =>
  queryOptions({
    queryKey: ["connection", id],
    queryFn: async (): Promise<Connection | null> => {
      const { data, error } = await supabase
        .from("event_interests")
        .select(
          "id, event_id, from_user, to_user, status, created_at, event:events(slug, title), from:profiles!event_interests_from_user_fkey(id, full_name), to:profiles!event_interests_to_user_fkey(id, full_name)",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as Connection | null;
    },
  });

export const connectionMessagesQuery = (id: number) =>
  queryOptions({
    queryKey: ["connection-messages", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connection_messages")
        .select("id, sender_id, message_text, created_at")
        .eq("interest_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 4_000,
  });

/** Bundled art lives under /events/*, admin uploads live in the private art bucket. */
export async function resolveEventImage(url: string | null): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("/") || url.startsWith("http")) return url;
  const path = url.replace(`${ART_BUCKET}/`, "");
  const { data } = await supabase.storage.from(ART_BUCKET).createSignedUrl(path, 60 * 60 * 6);
  return data?.signedUrl ?? null;
}

export function eventDestination(e: CampusEvent) {
  return e.cta_path || `/events/${e.slug}`;
}

export function formatEventDate(e: CampusEvent) {
  if (!e.starts_at) return null;
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  };
  const start = new Date(e.starts_at).toLocaleString("en-IN", opts);
  return e.ends_at ? `${start} – ${new Date(e.ends_at).toLocaleString("en-IN", opts)}` : start;
}
