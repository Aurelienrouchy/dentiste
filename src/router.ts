import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Create and export the router
export const router = createRouter({ routeTree });

// Register type
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
