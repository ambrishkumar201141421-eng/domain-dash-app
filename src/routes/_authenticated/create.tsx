import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, CATEGORY_META, isLive, type Category } from "@/lib/campus";
import { myTasksQuery } from "@/lib/queries";
import { createTaskChecked } from "@/lib/moderation.functions";
import { scanText, restrictionMessage } from "@/lib/moderation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/create")({
  head: () => ({
    meta: [
      { title: "Post a campus task — Campus Hustle" },
      {
        name: "description",
        content:
          "Post an errand, a game invite or a hangout to your campus feed and set a reward and deadline.",
      },
      { property: "og:title", content: "Post a campus task — Campus Hustle" },
      {
        property: "og:description",
        content: "Create a Hustle, Playground or Lounge post for your college.",
      },
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
];

function CreateTask() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: myTasks } = useQuery(myTasksQuery(user.id));

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("Hustle");
  const [reward, setReward] = useState("");
  const [expiry, setExpiry] = useState(0);

  const activeCount = (myTasks ?? []).filter(
    (t) => t.poster_id === user.id && (t.status === "Accepted" || isLive(t)),
  ).length;
  const blocked = activeCount >= 3;

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          poster_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          category,
          reward: reward.trim(),
          expires_at: expiry ? new Date(Date.now() + expiry * 60000).toISOString() : null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      toast.success("Posted to your campus feed");
      navigate({ to: "/task/$id", params: { id: String(data.id) } });
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

      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (blocked) return;
          create.mutate();
        }}
      >
        <div className="space-y-2">
          <Label>Vibe</Label>
          <div className="grid gap-2">
            {CATEGORIES.map((c) => {
              const meta = CATEGORY_META[c];
              return (
                <button
                  key={c}
                  type="button"
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

        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Pick up my Amazon parcel from Main Gate"
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
            placeholder="Anything the helper should know…"
            maxLength={500}
            rows={4}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reward">Reward</Label>
          <Input
            id="reward"
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            placeholder="₹50 cash / cold drink / canteen treat"
            maxLength={60}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Expires in</Label>
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
