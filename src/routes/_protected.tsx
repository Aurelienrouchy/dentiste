import { createRoute, Outlet } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/firebase/auth-context";
import { LoginPage } from "./LoginPage";
import { Route as rootRoute } from "./_root";

// Protected layout component
function ProtectedLayout() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    // Redirect to login page if not authenticated
    return <LoginPage />;
  }

  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  id: "protected",
  component: ProtectedLayout,
});
