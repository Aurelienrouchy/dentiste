import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { integrationService } from '@/lib/services/integration.service';
import { 
  Integration, 
  IntegrationType, 
  IntegrationConfig, 
  SyncResult 
} from '@/lib/types/integration';
import { Patient } from '@/lib/types/patient';

interface UseIntegrationReturn {
  // État
  integrations: Integration[];
  loading: boolean;
  error: string | null;
  
  // Actions
  connectIntegration: (type: IntegrationType, config: IntegrationConfig) => Promise<boolean>;
  disconnectIntegration: (type: IntegrationType) => Promise<boolean>;
  exportPatients: (type: IntegrationType, patients: Patient[]) => Promise<SyncResult>;
  triggerZapierWebhook: (eventType: 'new_patient' | 'updated_patient' | 'new_appointment', data: any) => Promise<SyncResult>;
  backupToGoogleDrive: (fileData: string, fileName: string) => Promise<SyncResult>;
  
  // Intégrations spécifiques par type
  getIntegration: (type: IntegrationType) => Integration | undefined;
  isIntegrationConnected: (type: IntegrationType) => boolean;
}

export function useIntegration(): UseIntegrationReturn {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Charger les intégrations disponibles
  useEffect(() => {
    if (user) {
      loadIntegrations();
    } else {
      setIntegrations([]);
      setLoading(false);
    }
  }, [user]);
  
  // Fonction pour charger les intégrations
  const loadIntegrations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (user) {
        const userIntegrations = await integrationService.getIntegrations(user.uid);
        setIntegrations(userIntegrations);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des intégrations');
      console.error('Erreur lors du chargement des intégrations:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Connecter une intégration
  const connectIntegration = async (type: IntegrationType, config: IntegrationConfig): Promise<boolean> => {
    if (!user) {
      setError('Vous devez être connecté pour configurer une intégration');
      return false;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const success = await integrationService.connectIntegration(user.uid, type, config);
      
      if (success) {
        // Recharger les intégrations pour avoir les données à jour
        await loadIntegrations();
      }
      
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la connexion à l\'intégration');
      console.error(`Erreur lors de la connexion à ${type}:`, err);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Déconnecter une intégration
  const disconnectIntegration = async (type: IntegrationType): Promise<boolean> => {
    if (!user) {
      setError('Vous devez être connecté pour déconnecter une intégration');
      return false;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const success = await integrationService.disconnectIntegration(user.uid, type);
      
      if (success) {
        // Recharger les intégrations pour avoir les données à jour
        await loadIntegrations();
      }
      
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la déconnexion de l\'intégration');
      console.error(`Erreur lors de la déconnexion de ${type}:`, err);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Exporter des patients
  const exportPatients = async (type: IntegrationType, patients: Patient[]): Promise<SyncResult> => {
    if (!user) {
      return {
        success: false,
        message: 'Vous devez être connecté pour exporter des patients',
        timestamp: new Date().toISOString(),
        errors: ['Non connecté']
      };
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await integrationService.exportPatients(user.uid, type, patients);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'export des patients';
      setError(errorMessage);
      console.error(`Erreur lors de l'export des patients vers ${type}:`, err);
      
      return {
        success: false,
        message: errorMessage,
        timestamp: new Date().toISOString(),
        errors: [errorMessage]
      };
    } finally {
      setLoading(false);
    }
  };
  
  // Déclencher un webhook Zapier
  const triggerZapierWebhook = async (
    eventType: 'new_patient' | 'updated_patient' | 'new_appointment', 
    data: any
  ): Promise<SyncResult> => {
    if (!user) {
      return {
        success: false,
        message: 'Vous devez être connecté pour déclencher un webhook Zapier',
        timestamp: new Date().toISOString(),
        errors: ['Non connecté']
      };
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await integrationService.triggerZapierWebhook(user.uid, eventType, data);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du déclenchement du webhook Zapier';
      setError(errorMessage);
      console.error('Erreur lors du déclenchement du webhook Zapier:', err);
      
      return {
        success: false,
        message: errorMessage,
        timestamp: new Date().toISOString(),
        errors: [errorMessage]
      };
    } finally {
      setLoading(false);
    }
  };
  
  // Sauvegarder un fichier sur Google Drive
  const backupToGoogleDrive = async (fileData: string, fileName: string): Promise<SyncResult> => {
    if (!user) {
      return {
        success: false,
        message: 'Vous devez être connecté pour sauvegarder sur Google Drive',
        timestamp: new Date().toISOString(),
        errors: ['Non connecté']
      };
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await integrationService.backupToGoogleDrive(user.uid, fileData, fileName);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde sur Google Drive';
      setError(errorMessage);
      console.error('Erreur lors de la sauvegarde sur Google Drive:', err);
      
      return {
        success: false,
        message: errorMessage,
        timestamp: new Date().toISOString(),
        errors: [errorMessage]
      };
    } finally {
      setLoading(false);
    }
  };
  
  // Récupérer une intégration par type
  const getIntegration = (type: IntegrationType): Integration | undefined => {
    return integrations.find(integration => integration.id === type);
  };
  
  // Vérifier si une intégration est connectée
  const isIntegrationConnected = (type: IntegrationType): boolean => {
    const integration = getIntegration(type);
    return !!integration?.isConnected;
  };
  
  return {
    // État
    integrations,
    loading,
    error,
    
    // Actions
    connectIntegration,
    disconnectIntegration,
    exportPatients,
    triggerZapierWebhook,
    backupToGoogleDrive,
    
    // Helpers
    getIntegration,
    isIntegrationConnected
  };
} 