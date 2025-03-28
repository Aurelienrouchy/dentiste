import { createFileRoute } from "@tanstack/react-router";
import { PatientsPage } from "../PatientsPage";

export const Route = createFileRoute("/__protected/patients")({
  component: PatientsPage,
});
