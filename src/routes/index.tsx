import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AccueilPage } from "./AccueilPage";
import { DocumentsPage } from "./DocumentsPage";
import { PatientsPage } from "./PatientsPage";
import { ContactsPage } from "./ContactsPage";
import { LoginPage } from "./LoginPage";
import { RegisterPage } from "./RegisterPage";
import { ResetPasswordPage } from "./ResetPasswordPage";
import IntegrationsPage from "./IntegrationsPage";
import { TemplatesPage } from "./TemplatesPage";
// import { AdminPage } from "./AdminPage";
import { useAuth } from "@/lib/firebase/auth-context";
import { MobileRecordPage } from "./MobileRecordPage";

// Route racine
const rootRoute = createRootRoute({
  component: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { loading } = useAuth();

    if (loading) {
      return (
        <div className="flex h-screen items-center justify-center">
          Chargement...
        </div>
      );
    }

    return <Outlet />;
  },
});

// Routes d'authentification
export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

export const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterPage,
});

export const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reset-password",
  component: ResetPasswordPage,
});

// Wrapper de route protégée
const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "protected",
  component: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { currentUser } = useAuth();

    if (!currentUser) {
      // Redirection vers la page de connexion si non authentifié
      return <LoginPage />;
    }

    return (
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    );
  },
});

// Routes du tableau de bord
export const indexRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/",
  component: AccueilPage,
});

export const documentsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/documents",
  component: DocumentsPage,
});

export const patientsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/patients",
  component: PatientsPage,
});

export const contactsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/contacts",
  component: ContactsPage,
});

export const integrationsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/integrations",
  component: IntegrationsPage,
});

export const templatesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/templates",
  component: MobileRecordPage,
});

// export const adminRoute = createRoute({
//   getParentRoute: () => protectedRoute,
//   path: "/admin",
//   component: AdminPage,
// });

export const mobileRecordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/mobile-record",
  component: MobileRecordPage,
  validateSearch: (search) => {
    return {
      sessionId: search.sessionId || "",
    };
  },
});

// Création du routeur
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
    // adminRoute,
  ]),
]);

export const router = createRouter({ routeTree });

// Enregistrement du routeur pour la sécurité de type
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
