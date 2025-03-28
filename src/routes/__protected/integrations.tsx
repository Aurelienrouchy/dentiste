import { createRoute } from "@tanstack/react-router";
import IntegrationsComponent from "../IntegrationsPage";
import { Route as protectedRoute } from "../__protected";

export function Component() {
  return <IntegrationsComponent />;
}

export const Route = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/integrations",
  component: Component,
});
