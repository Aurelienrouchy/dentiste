import { createFileRoute } from "@tanstack/react-router";
import { ContactsPage } from "../ContactsPage";

export const Route = createFileRoute("/__protected/contacts")({
  component: ContactsPage,
});
