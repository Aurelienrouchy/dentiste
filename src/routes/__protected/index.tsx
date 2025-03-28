import { createRoute } from "@tanstack/react-router";
import { AccueilPage as HomeComponent } from "../AccueilPage";
import { Route as protectedRoute } from "../__protected";

export function Component() {
  return <HomeComponent />;
}

export const Route = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/",
  component: Component,
});
