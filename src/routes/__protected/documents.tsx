import { createRoute } from "@tanstack/react-router";
import { DocumentsPage as DocumentsComponent } from "../DocumentsPage";
import { Route as protectedRoute } from "../__protected";

export function Component() {
  return <DocumentsComponent />;
}

export const Route = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/documents",
  component: Component,
});
