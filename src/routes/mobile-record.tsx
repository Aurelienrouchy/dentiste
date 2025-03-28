import { createRoute } from "@tanstack/react-router";
import { MobileRecordPage as MobileRecordComponent } from "./MobileRecordPage";
import { Route as rootRoute } from "./__root";

export function Component() {
  return <MobileRecordComponent />;
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/mobile-record",
  component: Component,
  validateSearch: (search) => {
    return {
      sessionId: search.sessionId || "",
    };
  },
});
