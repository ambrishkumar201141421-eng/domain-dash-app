import { createFileRoute, redirect } from "@tanstack/react-router";

// Some visitors land on /index directly; send them to the real home page.
export const Route = createFileRoute("/index")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
