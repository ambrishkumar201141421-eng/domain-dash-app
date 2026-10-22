import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CATEGORIES,
  CATEGORY_META,
  COMPENSATION_LABEL,
  GROUP_PREF_LABEL,
  LISTING_LABEL,
  SUBCATEGORIES,
  isLive,
  rewardRequired,
  type Category,
  type Compensation,
  type GroupPref,
  type ListingType,
} from "@/lib/campus";
import { myTasksQuery } from "@/lib/queries";
import { createTaskChecked } from "@/lib/moderation.functions";
import { scanText, restrictionMessage } from "@/lib/moderation";
import { cn } from "@/lib/utils";

type CreateSearch = { category?: Category };

export const Route = createFileRoute("/_authenticated/create")({
  validateSearch: (s: Record<string, unknown>): CreateSearch =>
    typeof s["category"] === "string" && (CATEGORIES as string[]).includes(s["category"])
      ? { category: s["category"] as Category }
      : {},
  head: () => ({
    meta: [
      { title: "Post to your campus — Campus Hustle" },
      {
        name: "description",
        content:
          "Post a task, a sports invite, a hangout plan or a student hustle to your campus and get requests from verified classmates.",
      },
      { property: "og:title", content: "Post to your campus — Campus Hustle" },
      {
        property: "og:description",
        content: "Create a Campus Help, Sports, Hangouts or Student Hustles post for your college.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CreateTask,
});

const EXPIRY_OPTIONS = [
  { label: "No deadline", mins: 0 },
  { label: "15 min", mins: 15 },
  { label: "30 min", mins: 30 },
  { label: "1 hour", mins: 60 },
  { label: "3 hours", mins: 180 },
  { label: "Today", mins: 720 },
  { label: "3 days", mins: 4320 },
];

const COPY: Record<Category, { title: string; desc: string; reward: string; rewardLabel: string }> = {
  Hustle: {
    title: "Pick up my Amazon parcel from Main Gate",
    desc: "Anything the helper should know…",
    reward: "₹50 cash / cold drink / canteen treat",
    rewardLabel: "Reward",
  },
  Playground: {
    title: "Looking for a badminton partner this evening",
    desc: "Your level, what you'll bring, anything else…",
    reward: "",
    rewardLabel: "",
  },
  Lounge: {
    title: "Chai run to the night canteen",
    desc: "What's the plan? Who should join?",
    reward: "",
    rewardLabel: "",
  },
  Gigs: {
    title: "Designing posters for club events",
    desc: "What you need or what you offer, timeline, samples…",
    reward: "₹300 per poster",
    rewardLabel: "Pay",
  },
};

function Toggle<T extends string>({
  options,
  value,
  onChange,
  render,
}: {
  options: readonly T[];
  value: T | null;
  onChange: (v: T) => void;
  render?: (v: T) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          onClick={() => onChange(o)}
          className={cn(
            "rounded-full border border-border px-3 py-1.5 text-sm font-medium",
            value === o ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground",
          )}
        >
          {render ? render(o) : o}
        </button>
      ))}
    </div>
  );
}

function CreateTask() {
  const { user } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: myTasks } = useQuery(myTasksQuery(user.id));

  const [category, setCategory] = useState<Category>(search.category ?? "Hustle");
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const [expiry, setExpiry] = useState(0);
  const [listingType, setListingType] = useState<ListingType>("request");
  const [compensation, setCompensation] = useState<Compensation | null>(null);
  const [groupPref, setGroupPref] = useState<GroupPref>("either");
  const [groupSize, setGroupSize] = useState("");
  const [plannedFor, setPlannedFor] = useState("");
  const [locationNote, setLocationNote] = useState("");

  useEffect(() => {
    if (search.category) setCategory(search.category);
  }, [search.category]);
  useEffect(() => setSubcategory(null), [category]);

  const activeCount = (myTasks ?? []).filter(
    (t) => t.poster_id === user.id && (t.status === "Accepted" || isLive(t)),
  ).length;
  const blocked = activeCount >= 3;

  const submitTask = useServerFn(createTaskChecked);
  const localHits = scanText(title, description, reward, locationNote);
  const needsReward = rewardRequired(category, compensation);
  const showReward = category === "Hustle" || (category === "Gigs" && compensation !== null && compensation !== "unpaid");
  const showPlan = category === "Playground" || category === "Lounge";
  const showGroupSize = category === "Lounge" || (category === "Playground" && groupPref !== "partner");
  const copy = COPY[category];
  const rewardLabel =
    category === "Gigs" && compensation === "exchange" ? "What you'd like in return" : copy.rewardLabel;

  const create = useMutation({
    mutationFn: () =>
      submitTask({
        data: {
          title: title.trim(),
          description: description.trim() || null,
          category,
          reward: showReward ? reward.trim() : "",
          expiresAt: expiry ? new Date(Date.now() + expiry * 60000).toISOString() : null,
          subcategory,
          listingType: category === "Gigs" ? listingType : null,
          compensation: category === "Gigs" ? compensation : null,
          groupPref: category === "Playground" ? groupPref : null,
          groupSize: showGroupSize && groupSize ? Number(groupSize) : null,
          plannedFor: showPlan && plannedFor ? new Date(plannedFor).toISOString() : null,
          locationNote: showPlan ? locationNote.trim() || null : null,
        },
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries();
      if (result.ok) {
        toast.success("Posted to your campus");
        navigate({ to: "/task/$id", params: { id: String(result.id) } });
        return;
      }
      const message =
        restrictionMessage(result.status, result.suspendedUntil) ??
        "Your post was rejected for a policy violation.";
      toast.error(result.reason === "flagged" ? `Post rejected. ${message}` : message);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not post"),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Post something</h1>
        <p className="text-sm text-muted-foreground">
          {activeCount} of 3 active posts used. Finish or cancel one to free a slot.
        </p>
      </div>

      {blocked ? (
        <div className="rounded-2xl border border-urgent/40 bg-surface p-4 text-sm text-urgent">
          You already have 3 active posts. Complete or cancel one before posting again.
        </div>
      ) : null}

      {localHits.length > 0 ? (
        <div className="flex gap-2 rounded-2xl border border-urgent/40 bg-surface p-4 text-sm text-urgent">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            This wording breaks our campus rules. Posting it will be rejected and put your account
            under review for 30 days.
          </span>
        </div>
      ) : null}

      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (blocked) return;
          if (category === "Gigs" && !compensation) {
            toast.error("Choose paid, unpaid or skill exchange");
            return;
          }
          create.mutate();
        }}
      >
        <div className="space-y-2">
          <Label>Section</Label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((c) => {
              const meta = CATEGORY_META[c];
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    "rounded-xl border border-border bg-card p-3 text-left transition-colors",
                    category === c && meta.ring,
                  )}
                >
                  <span className={cn("text-sm font-bold", meta.text)}>{meta.label}</span>
                  <p className="text-xs text-muted-foreground">{meta.blurb}</p>
                </button>
              );
            })}
          </div>
        </div>

        {category === "Gigs" ? (
          <>
            <div className="space-y-2">
              <Label>Are you…</Label>
              <Toggle
                options={["request", "offer"] as const}
                value={listingType}
                onChange={setListingType}
                render={(v) => LISTING_LABEL[v]}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment</Label>
              <Toggle
                options={["paid", "unpaid", "exchange"] as const}
                value={compensation}
                onChange={setCompensation}
                render={(v) => COMPENSATION_LABEL[v]}
              />
            </div>
          </>
        ) : null}

        <div className="space-y-2">
          <Label>Type</Label>
          <Toggle options={SUBCATEGORIES[category]} value={subcategory} onChange={setSubcategory} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={copy.title}
            maxLength={90}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="desc">Details</Label>
          <Textarea
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={copy.desc}
            maxLength={500}
            rows={4}
          />
        </div>

        {category === "Playground" ? (
          <div className="space-y-2">
            <Label>Looking for</Label>
            <Toggle
              options={["partner", "group", "either"] as const}
              value={groupPref}
              onChange={setGroupPref}
              render={(v) => GROUP_PREF_LABEL[v]}
            />
          </div>
        ) : null}

        {showGroupSize ? (
          <div className="space-y-1.5">
            <Label htmlFor="size">Group size, including you (optional)</Label>
            <Input
              id="size"
              type="number"
              inputMode="numeric"
              min={2}
              max={50}
              value={groupSize}
              onChange={(e) => setGroupSize(e.target.value)}
              placeholder="e.g. 4"
            />
          </div>
        ) : null}

        {showPlan ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="when">Preferred date & time (optional)</Label>
              <Input
                id="when"
                type="datetime-local"
                value={plannedFor}
                onChange={(e) => setPlannedFor(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="where">General meeting spot (optional)</Label>
              <Input
                id="where"
                value={locationNote}
                onChange={(e) => setLocationNote(e.target.value)}
                placeholder="Sports complex / main canteen"
                maxLength={80}
              />
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5 text-primary" /> Keep it general. Share exact details and
                contacts only in your private chat.
              </p>
            </div>
          </>
        ) : null}

        {showReward ? (
          <div className="space-y-1.5">
            <Label htmlFor="reward">{rewardLabel}</Label>
            <Input
              id="reward"
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              placeholder={
                category === "Gigs" && compensation === "exchange"
                  ? "Help with my resume in return"
                  : copy.reward
              }
              maxLength={60}
              required={needsReward}
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label>Post expires in</Label>
          <div className="flex flex-wrap gap-2">
            {EXPIRY_OPTIONS.map((o) => (
              <button
                key={o.mins}
                type="button"
                onClick={() => setExpiry(o.mins)}
                className={cn(
                  "rounded-full border border-border px-3 py-1.5 text-sm font-medium",
                  expiry === o.mins
                    ? "border-primary bg-primary text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={blocked || create.isPending}>
          {create.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Post to campus
        </Button>
      </form>
    </div>
  );
}
