import { createRoute } from "@tanstack/react-router";
import { RegisterPage as RegisterComponent } from "./RegisterPage";
import { Route as rootRoute } from "./__root";

export function Component() {
  return <RegisterComponent />;
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: Component,
});
