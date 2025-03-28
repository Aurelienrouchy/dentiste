import { createFileRoute } from "@tanstack/react-router";
import { AccueilPage } from "./AccueilPage";

export const Route = createFileRoute("/accueil")({
  component: AccueilPage,
});
