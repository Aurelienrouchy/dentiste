import { createRoute } from "@tanstack/react-router";
import { LoginPage as LoginComponent } from "./LoginPage";
import { Route as rootRoute } from "./__root";

export function Component() {
  return <LoginComponent />;
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: Component,
});
