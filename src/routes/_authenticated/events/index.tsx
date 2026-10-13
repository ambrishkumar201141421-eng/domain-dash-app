import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { EventImage } from "@/components/EventImage";
import { publishedEventsQuery } from "@/lib/events";

export const Route = createFileRoute("/_authenticated/events/")({
  head: () => ({
    meta: [
      { title: "All events — Campus Hustle" },
      { name: "description", content: "Browse campus events and community activities." },
      { property: "og:title", content: "All events — Campus Hustle" },
      { property: "og:description", content: "Campus events and community activities." },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const { data, isLoading } = useQuery(publishedEventsQuery);
  if (isLoading) return <Loader2 className="mx-auto mt-16 size-5 animate-spin text-primary" />;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">All events</h1>
      {(data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No events yet.</p>}
      {(data ?? []).map((e) => (
        <div key={e.id} className="glass-card overflow-hidden rounded-2xl">
          <div className="relative aspect-[16/8]">
            <EventImage src={e.image_url} alt={e.image_alt ?? e.title} />
          </div>
          <div className="p-4">
            <p className="font-semibold">{e.title}</p>
            <p className="text-sm text-muted-foreground">{e.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
