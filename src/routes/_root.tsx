import { createRootRoute, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/lib/firebase/auth-context";

// Root component
function RootComponent() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Chargement...
      </div>
    );
  }

  return <Outlet />;
}

export const Route = createRootRoute({
  component: RootComponent,
});
