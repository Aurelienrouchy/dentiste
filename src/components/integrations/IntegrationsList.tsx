import { useState } from 'react';
import { useIntegration } from '@/lib/hooks/useIntegration';
import { IntegrationCard } from './IntegrationCard';
import { Integration, IntegrationType, IntegrationConfig } from '@/lib/types/integration';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export function IntegrationsList() {
  const { integrations, loading, error, connectIntegration, disconnectIntegration, exportPatients } = useIntegration();
  const { toast } = useToast();
  
  // État pour le dialogue de configuration
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [syncFrequency, setSyncFrequency] = useState<'daily' | 'weekly' | 'manual'>('manual');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Ouvrir le dialogue de configuration
  const handleOpenConfigDialog = (integration: Integration) => {
    setSelectedIntegration(integration);
    setApiKey('');
    setRefreshToken('');
    setSyncFrequency('manual');
    setConfigDialogOpen(true);
  };
  
  // Fermer le dialogue de configuration
  const handleCloseConfigDialog = () => {
    setConfigDialogOpen(false);
    setSelectedIntegration(null);
  };
  
  // Connecter une intégration
  const handleConnect = async () => {
    if (!selectedIntegration) return;
    
    setIsSubmitting(true);
    
    const config: IntegrationConfig = {
      apiKey: apiKey || undefined,
      refreshToken: refreshToken || undefined,
      syncFrequency,
      exportFormat: 'json',
      syncPatients: true,
      syncAppointments: false,
      syncTreatments: false
    };
    
    try {
      const success = await connectIntegration(selectedIntegration.id as IntegrationType, config);
      
      if (success) {
        toast({
          title: 'Intégration connectée',
          description: `L'intégration avec ${selectedIntegration.name} a été configurée avec succès.`,
          variant: 'default'
        });
        handleCloseConfigDialog();
      } else {
        toast({
          title: 'Erreur de connexion',
          description: `Impossible de connecter ${selectedIntegration.name}. Vérifiez vos informations d'identification.`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la connexion',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Déconnecter une intégration
  const handleDisconnect = async (integrationType: IntegrationType) => {
    try {
      const success = await disconnectIntegration(integrationType);
      
      if (success) {
        toast({
          title: 'Intégration déconnectée',
          description: `L'intégration a été déconnectée avec succès.`,
          variant: 'default'
        });
      } else {
        toast({
          title: 'Erreur de déconnexion',
          description: `Impossible de déconnecter l'intégration.`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la déconnexion',
        variant: 'destructive'
      });
    }
  };
  
  // Synchroniser une intégration
  const handleSync = (integration: Integration) => {
    toast({
      title: 'Synchronisation en cours',
      description: `Synchronisation avec ${integration.name} en cours...`,
      variant: 'default'
    });
    
    // Dans une implémentation réelle, nous appellerions les méthodes appropriées
    // en fonction du type d'intégration, mais pour l'instant, nous simulons simplement
    setTimeout(() => {
      toast({
        title: 'Synchronisation terminée',
        description: `Synchronisation avec ${integration.name} terminée avec succès.`,
        variant: 'default'
      });
    }, 2000);
  };
  
  // Générer les champs spécifiques pour chaque intégration
  const renderConfigFields = () => {
    if (!selectedIntegration) return null;
    
    switch (selectedIntegration.id) {
      case 'julie':
      case 'logosw':
      case 'weclever':
      case 'veasy':
        return (
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">Clé API</Label>
              <Input
                id="apiKey"
                placeholder="Entrez votre clé API"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Disponible dans les paramètres de votre compte {selectedIntegration.name}.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="syncFrequency">Fréquence de synchronisation</Label>
              <Select value={syncFrequency} onValueChange={(value: 'daily' | 'weekly' | 'manual') => setSyncFrequency(value)}>
                <SelectTrigger id="syncFrequency">
                  <SelectValue placeholder="Sélectionnez une fréquence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Quotidienne</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="manual">Manuelle</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      
      case 'zapier':
        return (
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">Clé API</Label>
              <Input
                id="apiKey"
                placeholder="Entrez votre clé API Zapier"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refreshToken">Token de rafraîchissement</Label>
              <Input
                id="refreshToken"
                placeholder="Entrez votre token de rafraîchissement"
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Obtenez ces informations depuis votre dashboard Zapier.
              </p>
            </div>
          </div>
        );
      
      case 'google_drive':
        return (
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="refreshToken">Token d'accès Google</Label>
              <Input
                id="refreshToken"
                placeholder="Entrez votre token d'accès Google"
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Connectez-vous à votre compte Google pour obtenir un token d'accès.
              </p>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  if (loading) {
    return (
      <div className="w-full flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="w-full p-4 border rounded-md bg-red-50 border-red-200 text-red-700 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
        <div>
          <p className="font-medium">Erreur lors du chargement des intégrations</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }
  
  if (integrations.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Aucune intégration disponible pour le moment.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            onConnect={() => handleOpenConfigDialog(integration)}
            onDisconnect={() => handleDisconnect(integration.id as IntegrationType)}
            onSync={() => handleSync(integration)}
          />
        ))}
      </div>
      
      {/* Dialogue de configuration */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Configurer l'intégration {selectedIntegration?.name}</DialogTitle>
            <DialogDescription>
              Entrez les informations de connexion nécessaires pour configurer cette intégration.
            </DialogDescription>
          </DialogHeader>
          
          {renderConfigFields()}
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseConfigDialog} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button onClick={handleConnect} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connexion...
                </>
              ) : 'Connecter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 