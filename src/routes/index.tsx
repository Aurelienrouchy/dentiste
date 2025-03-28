import { createRouter } from "@tanstack/react-router";

// Import all routes
import { Route as rootRoute } from "./_root";
import { Route as protectedRoute } from "./_protected";

// Auth routes
import { Route as loginRoute } from "./auth/login";
import { Route as registerRoute } from "./auth/register";
import { Route as resetPasswordRoute } from "./auth/reset-password";

// Dashboard routes
import { Route as indexRoute } from "./dashboard/index";
import { Route as documentsRoute } from "./dashboard/documents";
import { Route as patientsRoute } from "./dashboard/patients";
import { Route as contactsRoute } from "./dashboard/contacts";
import { Route as integrationsRoute } from "./dashboard/integrations";
import { Route as templatesRoute } from "./dashboard/templates";

// Mobile routes
import { Route as mobileRecordRoute } from "./mobile/record";

// Create the route tree
const routeTree = rootRoute.addChildren([
  loginRoute,
  registerRoute,
  resetPasswordRoute,
  mobileRecordRoute,
  protectedRoute.addChildren([
    indexRoute,
    documentsRoute,
    patientsRoute,
    contactsRoute,
    integrationsRoute,
    templatesRoute,
  ]),
]);

// Create the router
export const router = createRouter({ routeTree });

// Register for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
