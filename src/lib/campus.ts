export type Category = "Hustle" | "Playground" | "Lounge";

export const CATEGORIES: Category[] = ["Hustle", "Playground", "Lounge"];

export const CATEGORY_META: Record<
  Category,
  { label: string; blurb: string; text: string; chip: string; ring: string }
> = {
  Hustle: {
    label: "Hustle",
    blurb: "Errands, gate parcel pickups, printing runs, assignment support",
    text: "text-hustle",
    chip: "bg-hustle-soft text-hustle",
    ring: "border-hustle",
  },
  Playground: {
    label: "Playground",
    blurb: "Football, badminton, chess, board games — find a partner",
    text: "text-playground",
    chip: "bg-playground-soft text-playground",
    ring: "border-playground",
  },
  Lounge: {
    label: "Lounge",
    blurb: "Night walks, canteen chai runs, study groups",
    text: "text-lounge",
    chip: "bg-lounge-soft text-lounge",
    ring: "border-lounge",
  },
};

const COLLEGE_EMAIL = /^[^\s@]+@[^\s@]+\.(edu|edu\.[a-z]{2}|ac\.[a-z]{2})$/i;

export function isCollegeEmail(email: string) {
  return COLLEGE_EMAIL.test(email.trim());
}

export function domainOf(email: string) {
  return email.trim().toLowerCase().split("@")[1] ?? "";
}

export function relativeTime(iso: string | null | undefined) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function countdown(iso: string | null | undefined) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return { expired: true, label: "Expired", urgent: true };
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return { expired: false, label: `Expires in ${mins || 1} min`, urgent: true };
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)
    return { expired: false, label: `Expires in ${hrs}h ${mins % 60}m`, urgent: hrs < 2 };
  return { expired: false, label: `Expires in ${Math.floor(hrs / 24)}d`, urgent: false };
}

export function isLive(task: { status: string; expires_at: string | null }) {
  if (task.status !== "Open") return false;
  if (!task.expires_at) return true;
  return new Date(task.expires_at).getTime() > Date.now();
}
