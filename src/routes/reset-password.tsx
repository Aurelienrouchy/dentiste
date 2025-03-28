import { createRoute } from "@tanstack/react-router";
import { ResetPasswordPage as ResetPasswordComponent } from "./ResetPasswordPage";
import { Route as rootRoute } from "./__root";

export function Component() {
  return <ResetPasswordComponent />;
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reset-password",
  component: Component,
});
