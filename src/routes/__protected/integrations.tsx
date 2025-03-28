import { createFileRoute } from "@tanstack/react-router";
import IntegrationsPage from "../IntegrationsPage";

export const Route = createFileRoute("/__protected/integrations")({
  component: IntegrationsPage,
});
