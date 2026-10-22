export type Category = "Hustle" | "Playground" | "Lounge" | "Gigs";

export const CATEGORIES: Category[] = ["Hustle", "Playground", "Lounge", "Gigs"];

/** Posts in these sections use "I'm Interested" → organiser accepts → private chat unlocks. */
export const REQUEST_MODE: Category[] = ["Playground", "Lounge", "Gigs"];
export function isRequestMode(category: Category) {
  return REQUEST_MODE.includes(category);
}

export const CATEGORY_META: Record<
  Category,
  { label: string; blurb: string; text: string; chip: string; ring: string; anchor: string }
> = {
  Hustle: {
    label: "Campus Help",
    blurb: "Parcel pickups, errands, notes, assignments, coding or design help",
    text: "text-hustle",
    chip: "bg-hustle-soft text-hustle",
    ring: "border-hustle",
    anchor: "help",
  },
  Playground: {
    label: "Sports",
    blurb: "Find a partner or a group for badminton, cricket, gym, treks and more",
    text: "text-playground",
    chip: "bg-playground-soft text-playground",
    ring: "border-playground",
    anchor: "sports",
  },
  Lounge: {
    label: "Hangouts",
    blurb: "Chai runs, food, walks, movies, outings and study groups",
    text: "text-lounge",
    chip: "bg-lounge-soft text-lounge",
    ring: "border-lounge",
    anchor: "hangouts",
  },
  Gigs: {
    label: "Student Hustle",
    blurb: "Paid gigs, services you offer and skill exchanges",
    text: "text-gigs",
    chip: "bg-gigs-soft text-gigs",
    ring: "border-gigs",
    anchor: "hustles",
  },
};

export const SUBCATEGORIES: Record<Category, string[]> = {
  Hustle: [
    "Parcel & delivery",
    "Assignments",
    "Notes & study material",
    "Shopping & errands",
    "Coding & tech",
    "Design & presentations",
    "Other",
  ],
  Playground: [
    "Badminton",
    "Cricket",
    "Football",
    "Basketball",
    "Volleyball",
    "Running",
    "Gym & fitness",
    "Trekking",
    "Cycling",
    "Table tennis",
    "Board games",
    "Other",
  ],
  Lounge: [
    "Food & chai",
    "Exploring nearby",
    "Campus walk",
    "Movie outing",
    "Group outing",
    "College activity",
    "Study group",
    "Other",
  ],
  Gigs: [
    "Design & posters",
    "Presentations & docs",
    "Coding",
    "Tutoring",
    "Photo & video",
    "Content writing",
    "Notes exchange",
    "Small campus gig",
    "Other",
  ],
};

export type Compensation = "paid" | "unpaid" | "exchange";
export const COMPENSATION_LABEL: Record<Compensation, string> = {
  paid: "Paid",
  unpaid: "Unpaid help",
  exchange: "Skill exchange",
};

/** Reward is required for help tasks and paid/exchange gigs; optional for sports, hangouts and unpaid help. */
export function rewardRequired(category: Category, compensation?: Compensation | null) {
  if (category === "Hustle") return true;
  if (category === "Gigs") return compensation !== "unpaid";
  return false;
}

/** Spots left for a group post, counting the organiser. Null means no limit. */
export function spotsLeft(groupSize: number | null | undefined, acceptedCount: number) {
  if (!groupSize) return null;
  return Math.max(0, groupSize - 1 - acceptedCount);
}

export type ListingType = "request" | "offer";
export const LISTING_LABEL: Record<ListingType, string> = {
  request: "Looking for someone",
  offer: "Offering my skills",
};

export type GroupPref = "partner" | "group" | "either";
export const GROUP_PREF_LABEL: Record<GroupPref, string> = {
  partner: "1-on-1 partner",
  group: "Group",
  either: "Partner or group",
};

export const TIME_SLOTS = ["Morning", "Afternoon", "Evening", "Night"] as const;
export type TimeSlot = (typeof TIME_SLOTS)[number];

export function timeSlotOf(iso: string | null | undefined): TimeSlot | null {
  if (!iso) return null;
  const h = new Date(iso).getHours();
  if (h >= 5 && h < 12) return "Morning";
  if (h >= 12 && h < 17) return "Afternoon";
  if (h >= 17 && h < 21) return "Evening";
  return "Night";
}

export function formatPlanned(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

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

/** Events listed on the homepage: published, live, and not already over. */
export function isUpcomingEvent(e: { ends_at: string | null; starts_at: string | null }) {
  const end = e.ends_at ?? e.starts_at;
  return !end || new Date(end).getTime() > Date.now();
}
