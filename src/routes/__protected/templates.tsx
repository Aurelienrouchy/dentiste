import { createRoute } from "@tanstack/react-router";
import { TemplatesPage as TemplatesComponent } from "../TemplatesPage";
import { Route as protectedRoute } from "../__protected";

export function Component() {
  return <TemplatesComponent />;
}

export const Route = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/templates",
  component: Component,
});
