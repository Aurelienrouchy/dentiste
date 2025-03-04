import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { integrationService } from '@/lib/services/integration.service';
import { Integration, IntegrationType, IntegrationConfig } from '@/lib/types/integration';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link, RefreshCw, Settings, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ConfigurationDialog } from './ConfigurationDialog';
import { SynchronizationDialog } from './SynchronizationDialog';

export function IntegrationsPage() {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [config, setConfig] = useState<IntegrationConfig>({});
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [syncResult, setSyncResult] = useState<{success: boolean, message: string} | null>(null);

  // Charger les intégrations au chargement de la page
  useEffect(() => {
    if (user) {
      loadIntegrations();
    }
  }, [user]);

  // Charger les intégrations disponibles
  const loadIntegrations = async () => {
    try {
      setLoading(true);
      setError(null);
      if (user) {
        const userIntegrations = await integrationService.getIntegrations(user.uid);
        setIntegrations(userIntegrations as Integration[]);
      }
    } catch (err) {
      setError('Erreur lors du chargement des intégrations');
      console.error(err);
      toast.error('Impossible de charger les intégrations');
    } finally {
      setLoading(false);
    }
  };

  // Ouvrir le dialogue de configuration
  const handleConfigureClick = (integration: Integration) => {
    setSelectedIntegration(integration);
    const integrationConfig = 'config' in integration ? integration.config || {} : {};
    setConfig(integrationConfig);
    setConfigDialogOpen(true);
  };

  // Ouvrir le dialogue de synchronisation
  const handleSyncClick = (integration: Integration) => {
    setSelectedIntegration(integration);
    setSyncDialogOpen(true);
    setSyncResult(null);
  };

  // Gérer la connexion/déconnexion d'une intégration
  const handleConnectionToggle = async (integration: Integration) => {
    if (!user) return;
    
    try {
      if (integration.isConnected) {
        // Déconnecter
        await integrationService.disconnectIntegration(user.uid, integration.id as IntegrationType);
        await loadIntegrations();
        toast.success(`Déconnexion de ${integration.name} réussie`);
      } else {
        // Configurer pour connecter
        handleConfigureClick(integration);
      }
    } catch (err) {
      setError(`Erreur lors de la ${integration.isConnected ? 'déconnexion' : 'connexion'}`);
      console.error(err);
      toast.error(`Échec de la ${integration.isConnected ? 'déconnexion' : 'connexion'}`);
    }
  };

  // Enregistrer la configuration
  const handleSaveConfig = async () => {
    if (!user || !selectedIntegration) return;
    
    try {
      setLoading(true);
      await integrationService.connectIntegration(
        user.uid, 
        selectedIntegration.id as IntegrationType, 
        config
      );
      setConfigDialogOpen(false);
      await loadIntegrations();
      toast.success(`${selectedIntegration.name} connecté avec succès`);
    } catch (err) {
      setError('Erreur lors de la connexion à l\'intégration');
      console.error(err);
      toast.error('Impossible de se connecter à l\'intégration');
    } finally {
      setLoading(false);
    }
  };

  // Effectuer une synchronisation
  const handleSync = async () => {
    if (!user || !selectedIntegration) return;
    
    try {
      setSyncInProgress(true);
      setSyncResult(null);
      
      // Exemple: synchroniser les patients (dans une implémentation réelle, 
      // vous récupéreriez les patients de votre base de données)
      const mockPatients = [
        { 
          id: '1', 
          firstName: 'Jean', 
          lastName: 'Dupont', 
          birthDate: { day: '01', month: '01', year: '1980' },
          email: 'jean@example.com', 
          phoneNumber: '0123456789', 
          createdAt: new Date(), 
          gender: 'Monsieur' as const,
          updatedAt: new Date(),
          visibility: 'public' as const,
          createdBy: user.uid
        }
      ];
      
      const result = await integrationService.exportPatients(
        user.uid,
        selectedIntegration.id as IntegrationType,
        mockPatients
      );
      
      setSyncResult({
        success: result.success,
        message: result.message
      });
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setSyncResult({
        success: false,
        message: errorMessage
      });
      toast.error(`Échec de la synchronisation: ${errorMessage}`);
    } finally {
      setSyncInProgress(false);
    }
  };

  // Rendre le statut d'intégration avec un badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge>Disponible</Badge>;
      case 'coming_soon':
        return <Badge variant="outline">Bientôt disponible</Badge>;
      case 'not_available':
        return <Badge variant="destructive">Non disponible</Badge>;
      default:
        return null;
    }
  };

  // Afficher un état de chargement
  if (loading && integrations.length === 0) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Intégrations</h1>
        <p className="text-muted-foreground">
          Connectez votre cabinet à d'autres logiciels et services pour synchroniser vos données.
        </p>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((integration) => (
          <Card 
            key={integration.id} 
            className={`${integration.isConnected ? 'border-green-500 border-2' : ''}`}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle>{integration.name}</CardTitle>
                {integration.status === 'available' && (
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant={integration.isConnected ? "destructive" : "default"} 
                      size="sm"
                      onClick={() => handleConnectionToggle(integration)}
                      disabled={integration.status !== 'available'}
                    >
                      {integration.isConnected ? 'Déconnecter' : 'Connecter'}
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2 mt-1">
                {renderStatusBadge(integration.status || 'not_available')}
                {integration.isConnected && (
                  <Badge variant="outline" className="bg-primary/10">
                    <Link className="h-3 w-3 mr-1" />
                    Connecté
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-2">
                {integration.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {integration.lastSyncDate && (
                <p className="text-xs text-muted-foreground mt-2">
                  Dernière synchronisation: {new Date(integration.lastSyncDate).toLocaleString()}
                </p>
              )}
              
              <div className="flex justify-between mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleConfigureClick(integration)}
                  disabled={integration.status !== 'available'}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configurer
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSyncClick(integration)}
                  disabled={!integration.isConnected}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Synchroniser
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Utilisation des composants de dialogue séparés */}
      <ConfigurationDialog 
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        selectedIntegration={selectedIntegration}
        config={config}
        onConfigChange={setConfig}
        onSave={handleSaveConfig}
        loading={loading}
      />
      
      <SynchronizationDialog
        open={syncDialogOpen}
        onOpenChange={setSyncDialogOpen}
        selectedIntegration={selectedIntegration}
        onSync={handleSync}
        syncInProgress={syncInProgress}
        syncResult={syncResult}
      />
    </div>
  );
} 