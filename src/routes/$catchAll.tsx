import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/$catchAll")({
  // This route will catch all undefined routes
  // The $ in the filename makes this a dynamic route
  beforeLoad: () => {
    // Redirect to the 404 route
    throw redirect({ to: "/login" });
  },
});
