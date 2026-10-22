import { createFileRoute, redirect } from "@tanstack/react-router";

// Upcoming events live in the "Events & Fests" section of the home page.
export const Route = createFileRoute("/_authenticated/events/")({
  beforeLoad: () => {
    throw redirect({ to: "/", hash: "events", replace: true });
  },
});
