import { createFileRoute } from "@tanstack/react-router";
import { ResetPasswordPage } from "./ResetPasswordPage";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});
