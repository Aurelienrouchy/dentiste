import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { IntegrationService } from '../services/integration.service';
import { Integration, IntegrationType, IntegrationConfig, SyncResult } from '../types/integration';
import { Patient } from '../types/patient';

// Créer une instance du service d'intégration
const integrationService = new IntegrationService();

export function useIntegrations() {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les intégrations au chargement du hook
  useEffect(() => {
    if (user) {
      loadIntegrations();
    } else {
      setIntegrations([]);
      setLoading(false);
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
    } finally {
      setLoading(false);
    }
  };

  // Connecter une intégration
  const connectIntegration = async (integrationType: IntegrationType, config: IntegrationConfig) => {
    if (!user) return false;
    
    try {
      setLoading(true);
      setError(null);
      await integrationService.connectIntegration(user.uid, integrationType, config);
      await loadIntegrations();
      return true;
    } catch (err) {
      setError(`Erreur lors de la connexion à ${integrationType}`);
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Déconnecter une intégration
  const disconnectIntegration = async (integrationType: IntegrationType) => {
    if (!user) return false;
    
    try {
      setLoading(true);
      setError(null);
      await integrationService.disconnectIntegration(user.uid, integrationType);
      await loadIntegrations();
      return true;
    } catch (err) {
      setError(`Erreur lors de la déconnexion de ${integrationType}`);
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Exporter des patients vers une intégration
  const exportPatients = async (integrationType: IntegrationType, patients: Patient[]): Promise<SyncResult> => {
    if (!user) {
      return {
        success: false,
        message: 'Utilisateur non connecté',
        timestamp: new Date().toISOString(),
        errors: ['Utilisateur non connecté']
      };
    }
    
    try {
      return await integrationService.exportPatients(user.uid, integrationType, patients);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error(`Erreur lors de l'export des patients vers ${integrationType}:`, err);
      
      return {
        success: false,
        message: `Échec de l'export: ${errorMessage}`,
        timestamp: new Date().toISOString(),
        errors: [errorMessage]
      };
    }
  };

  // Importer des patients depuis Julie
  const importPatientsFromJulie = async (): Promise<SyncResult> => {
    if (!user) {
      return {
        success: false,
        message: 'Utilisateur non connecté',
        timestamp: new Date().toISOString(),
        errors: ['Utilisateur non connecté']
      };
    }
    
    try {
      return await integrationService.importPatientsFromJulie(user.uid);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('Erreur lors de l\'import des patients depuis Julie:', err);
      
      return {
        success: false,
        message: `Échec de l'import: ${errorMessage}`,
        timestamp: new Date().toISOString(),
        errors: [errorMessage]
      };
    }
  };

  // Récupérer les rendez-vous depuis Julie
  const getAppointmentsFromJulie = async (startDate: string, endDate: string): Promise<SyncResult> => {
    if (!user) {
      return {
        success: false,
        message: 'Utilisateur non connecté',
        timestamp: new Date().toISOString(),
        errors: ['Utilisateur non connecté']
      };
    }
    
    try {
      return await integrationService.getAppointmentsFromJulie(user.uid, startDate, endDate);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('Erreur lors de la récupération des rendez-vous depuis Julie:', err);
      
      return {
        success: false,
        message: `Échec de la récupération: ${errorMessage}`,
        timestamp: new Date().toISOString(),
        errors: [errorMessage]
      };
    }
  };

  // Vérifier si une intégration est connectée
  const isIntegrationConnected = (integrationType: IntegrationType): boolean => {
    const integration = integrations.find(i => i.id === integrationType);
    return !!integration?.isConnected;
  };

  // Obtenir une intégration spécifique
  const getIntegration = (integrationType: IntegrationType): Integration | undefined => {
    return integrations.find(i => i.id === integrationType);
  };

  return {
    integrations,
    loading,
    error,
    loadIntegrations,
    connectIntegration,
    disconnectIntegration,
    exportPatients,
    importPatientsFromJulie,
    getAppointmentsFromJulie,
    isIntegrationConnected,
    getIntegration
  };
} 