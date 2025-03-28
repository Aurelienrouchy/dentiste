import { createRoute } from "@tanstack/react-router";
import { PatientsPage as PatientsComponent } from "../PatientsPage";
import { Route as protectedRoute } from "../__protected";

export function Component() {
  return <PatientsComponent />;
}

export const Route = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/patients",
  component: Component,
});
