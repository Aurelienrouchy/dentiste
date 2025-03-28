import { createFileRoute } from "@tanstack/react-router";
import { TemplatesPage } from "../TemplatesPage";

export const Route = createFileRoute("/__protected/templates")({
  component: TemplatesPage,
});
