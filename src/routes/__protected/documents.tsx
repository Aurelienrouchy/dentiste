import { createFileRoute } from "@tanstack/react-router";
import { DocumentsPage } from "../DocumentsPage";

export const Route = createFileRoute("/__protected/documents")({
  component: DocumentsPage,
});
