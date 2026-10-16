import { createFileRoute, redirect } from "@tanstack/react-router";

// Garba Night is the only featured event; the old events list now points there.
export const Route = createFileRoute("/_authenticated/events/")({
  beforeLoad: () => {
    throw redirect({ to: "/garba", replace: true });
  },
});
