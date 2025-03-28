import { createRoute } from "@tanstack/react-router";
import { ContactsPage as ContactsComponent } from "../ContactsPage";
import { Route as protectedRoute } from "../__protected";

export function Component() {
  return <ContactsComponent />;
}

export const Route = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/contacts",
  component: Component,
});
