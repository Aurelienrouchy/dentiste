import { createRootRoute, createRoute } from "@tanstack/react-router";
import { MobileRecordPage } from "./routes/MobileRecordPage";

// Définir la route racine
export const rootRoute = createRootRoute();

// Définir la route mobile-record
export const mobileRecordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/mobile-record",
  component: MobileRecordPage,
  // Spécifiez que les paramètres de recherche sont attendus
  validateSearch: (search) => {
    return {
      sessionId: search.sessionId || "",
    };
  },
});

// Exporter les routes
export const routeTree = rootRoute.addChildren([
  mobileRecordRoute,
  // ...autres routes
]);
