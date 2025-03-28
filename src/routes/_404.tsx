import { createFileRoute } from "@tanstack/react-router";

// 404 Page component
function NotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">404 - Page non trouvée</h1>
      <p className="mt-4 text-lg">La page que vous recherchez n'existe pas.</p>
      <a
        href="/"
        className="mt-6 rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90"
      >
        Retourner à l'accueil
      </a>
    </div>
  );
}

export const Route = createFileRoute("/_404")({
  component: NotFoundPage,
});
