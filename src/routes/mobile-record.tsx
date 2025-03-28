import { createFileRoute } from "@tanstack/react-router";
import { MobileRecordPage } from "./MobileRecordPage";

export const Route = createFileRoute("/mobile-record")({
  component: MobileRecordPage,
  validateSearch: (search) => {
    return {
      sessionId: search.sessionId ? String(search.sessionId) : "",
    };
  },
});
