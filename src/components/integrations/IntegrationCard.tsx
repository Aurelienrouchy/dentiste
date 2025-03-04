import { Integration, IntegrationStatus } from "@/lib/types/integration";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Check, AlertTriangle, RefreshCw } from "lucide-react";

interface IntegrationCardProps {
  integration: Integration;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync?: () => void;
}

export function IntegrationCard({
  integration,
  onConnect,
  onDisconnect,
  onSync,
}: IntegrationCardProps) {
  // Afficher le statut sous forme de badge
  const renderStatusBadge = (status: IntegrationStatus) => {
    switch (status) {
      case "available":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            Disponible
          </Badge>
        );
      case "coming_soon":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            Bientôt disponible
          </Badge>
        );
      case "not_available":
        return (
          <Badge
            variant="outline"
            className="bg-gray-50 text-gray-700 border-gray-200"
          >
            Pas encore disponible
          </Badge>
        );
      default:
        return null;
    }
  };

  // Convertir la date en format lisible
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Jamais";

    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const isDisabled = integration.status !== "available";

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-xl">{integration.name}</CardTitle>
          {renderStatusBadge(integration.status)}
        </div>
        {integration.logoUrl && (
          <div className="w-12 h-12 rounded overflow-hidden bg-white p-1">
            <img
              src={integration.logoUrl}
              alt={`${integration.name} logo`}
              className="w-full h-full object-contain"
            />
          </div>
        )}
      </CardHeader>

      <CardContent>
        <CardDescription className="mb-4">
          {integration.description}
        </CardDescription>

        {integration.isConnected && (
          <div className="flex items-center text-sm text-muted-foreground mt-2">
            <Clock className="mr-2 h-4 w-4" />
            <span>
              Dernière synchronisation : {formatDate(integration.lastSyncDate)}
            </span>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2 justify-end">
        {integration.isConnected ? (
          <>
            {onSync && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSync}
                disabled={isDisabled}
                className="gap-1"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Synchroniser
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={onDisconnect}
              disabled={isDisabled}
              className="gap-1"
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Déconnecter
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onConnect}
            disabled={isDisabled}
            className="gap-1"
          >
            <Check className="h-4 w-4 mr-1" />
            Connecter
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
