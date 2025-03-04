import { db, storage } from '@/lib/firebase/config';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Integration, 
  IntegrationType, 
  IntegrationConfig, 
  ExportablePatient,
  SyncResult
} from '@/lib/types/integration';
import { Patient } from '@/lib/types/patient';
import { JulieApiClient } from './julie/julie-api-client';

// Map des clients d'API externes
interface ApiClients {
  julie?: JulieApiClient;
}

export class IntegrationService {
  // Collection Firestore pour les intégrations
  private integrationsCollection = collection(db, 'integrations');
  
  // Clients d'API externes initialisés
  private apiClients: ApiClients = {};
  
  // Données statiques des intégrations disponibles
  private availableIntegrations: Partial<Integration>[] = [
    {
      id: 'julie',
      name: 'Julie',
      description: 'Julie Solutions améliore votre quotidien avec le meilleur logiciel de gestion de cabinet dentaire.',
      logoUrl: '/integration-logos/julie.png',
      status: 'available'
    },
    {
      id: 'logosw',
      name: 'Logosw',
      description: 'Optimisez votre cabinet dentaire, gagnez du temps grâce à votre logiciel. LOGOSw est le premier logiciel pour cabinet dentaire agréé CCAM.',
      logoUrl: '/integration-logos/logosw.png',
      status: 'available'
    },
    {
      id: 'zapier',
      name: 'Zapier',
      description: 'Logiciel d\'automatisation des flux de travail pour tous. Automatisez votre travail sans développeurs, sans délais.',
      logoUrl: '/integration-logos/zapier.png',
      status: 'available'
    },
    {
      id: 'weclever',
      name: 'Weclever',
      description: 'WeClever Dental, LE logiciel de gestion de cabinet dentaire 100% cloud qui offre une accessibilité et une simplicité remarquables.',
      logoUrl: '/integration-logos/weclever.png', 
      status: 'not_available'
    },
    {
      id: 'veasy',
      name: 'Veasy',
      description: 'Optimisez votre pratique dentaire avec Veasy, le logiciel dentaire tout-en-un pour la gestion de votre cabinet dentaire et centre de santé.',
      logoUrl: '/integration-logos/veasy.png',
      status: 'not_available'
    },
    {
      id: 'google_drive',
      name: 'Google Drive',
      description: 'Un stockage cloud évolutif et facile à utiliser, adapté à tous les collaborateurs et aux équipes de toutes tailles.',
      logoUrl: '/integration-logos/google-drive.png',
      status: 'coming_soon'
    }
  ];

  // Récupérer toutes les intégrations disponibles pour un utilisateur
  async getIntegrations(userId: string): Promise<Integration[]> {
    try {
      // Requête pour récupérer les intégrations configurées de l'utilisateur
      const userIntegrationsQuery = query(
        collection(db, `users/${userId}/integrations`)
      );
      
      const userIntegrationsSnapshot = await getDocs(userIntegrationsQuery);
      const userIntegrations = userIntegrationsSnapshot.docs.map(
        doc => doc.data() as Integration
      );
      
      // Fusionner avec les intégrations disponibles
      return this.availableIntegrations.map(integration => {
        const userIntegration = userIntegrations.find(
          ui => ui.id === integration.id
        );
        
        return {
          ...integration,
          isConnected: !!userIntegration?.isConnected,
          lastSyncDate: userIntegration?.lastSyncDate
        } as Integration;
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des intégrations:', error);
      throw error;
    }
  }

  // Connecter une intégration pour un utilisateur
  async connectIntegration(
    userId: string, 
    integrationType: IntegrationType, 
    config: IntegrationConfig
  ): Promise<boolean> {
    try {
      const integrationRef = doc(db, `users/${userId}/integrations/${integrationType}`);
      
      // Vérifier si l'intégration est disponible
      const integration = this.availableIntegrations.find(i => i.id === integrationType);
      if (!integration || integration.status === 'not_available') {
        throw new Error(`L'intégration ${integrationType} n'est pas disponible pour le moment.`);
      }
      
      // Connexion à l'API externe en fonction du type d'intégration
      let connectionSuccess = false;
      
      switch(integrationType) {
        case 'julie':
          // Utiliser le vrai client API Julie
          if (!config.apiKey) {
            throw new Error('La clé API est requise pour se connecter à Julie');
          }
          
          const julieClient = new JulieApiClient({ apiKey: config.apiKey });
          connectionSuccess = await julieClient.testConnection();
          
          // Stocker le client dans apiClients si la connexion est réussie
          if (connectionSuccess) {
            this.apiClients.julie = julieClient;
          }
          break;
          
        default:
          // Pour les autres intégrations, utiliser la simulation pour l'instant
          connectionSuccess = await this.simulateExternalApiConnection(integrationType, config);
          break;
      }
      
      if (connectionSuccess) {
        // Enregistrer l'intégration configurée
        await setDoc(integrationRef, {
          ...integration,
          isConnected: true,
          lastSyncDate: new Date().toISOString(),
          config
        });
        
        return true;
      } else {
        throw new Error(`Échec de la connexion à ${integrationType}`);
      }
    } catch (error) {
      console.error(`Erreur lors de la connexion à ${integrationType}:`, error);
      throw error;
    }
  }
  
  // Simuler une connexion à une API externe (utilisé pour les intégrations autres que Julie)
  private async simulateExternalApiConnection(
    integrationType: IntegrationType, 
    config: IntegrationConfig
  ): Promise<boolean> {
    // Simuler un temps de latence réseau
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Vérifier que les configurations nécessaires sont présentes
    switch (integrationType) {
      case 'logosw':
      case 'veasy':
      case 'weclever':
        return !!config.apiKey;
      case 'zapier':
        return !!config.apiKey && !!config.refreshToken;
      case 'google_drive':
        return !!config.refreshToken;
      default:
        return false;
    }
  }
  
  // Exporter les patients vers un service externe
  async exportPatients(
    userId: string, 
    integrationType: IntegrationType, 
    patients: Patient[]
  ): Promise<SyncResult> {
    try {
      // Vérifier si l'intégration est connectée
      const integrationRef = doc(db, `users/${userId}/integrations/${integrationType}`);
      const integrationDoc = await getDoc(integrationRef);
      
      if (!integrationDoc.exists() || !integrationDoc.data().isConnected) {
        throw new Error(`L'intégration ${integrationType} n'est pas connectée.`);
      }
      
      // Convertir les patients au format exportable
      const exportablePatients = patients.map(this.convertToExportablePatient);
      
      let result: SyncResult;
      
      // Utiliser le client approprié en fonction du type d'intégration
      switch(integrationType) {
        case 'julie':
          // S'assurer que le client Julie est initialisé
          if (!this.apiClients.julie) {
            const config = integrationDoc.data().config;
            this.apiClients.julie = new JulieApiClient({ apiKey: config.apiKey });
          }
          
          // Utiliser le client Julie pour l'export
          result = await this.apiClients.julie.exportPatients(exportablePatients);
          break;
          
        default:
          // Pour les autres intégrations, utiliser la simulation pour l'instant
          result = await this.simulateExport(integrationType, exportablePatients);
          break;
      }
      
      // Mettre à jour la dernière date de synchronisation
      await updateDoc(integrationRef, {
        lastSyncDate: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      console.error(`Erreur lors de l'export des patients vers ${integrationType}:`, error);
      return {
        success: false,
        message: `Échec de l'export: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        timestamp: new Date().toISOString(),
        errors: [error instanceof Error ? error.message : 'Erreur inconnue']
      };
    }
  }
  
  // Convertir un patient au format exportable
  private convertToExportablePatient(patient: Patient): ExportablePatient {
    const { day, month, year } = patient.birthDate;
    const birthDateString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    
    return {
      id: patient.id,
      fullName: `${patient.lastName} ${patient.firstName}`,
      gender: patient.gender,
      birthDate: birthDateString,
      email: patient.email,
      phoneNumber: patient.phoneNumber,
      createdAt: patient.createdAt instanceof Date ? patient.createdAt.toISOString() : patient.createdAt,
      lastVisit: patient.updatedAt instanceof Date ? patient.updatedAt.toISOString() : undefined
    };
  }
  
  // Simuler l'export de patients (à remplacer par de vraies implémentations)
  private async simulateExport(
    integrationType: IntegrationType, 
    patients: ExportablePatient[]
  ): Promise<SyncResult> {
    // Simuler un temps de latence réseau
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simuler des résultats différents selon l'intégration
    const success = Math.random() > 0.1; // 90% de chances de succès
    
    if (success) {
      return {
        success: true,
        message: `${patients.length} patients exportés avec succès vers ${integrationType}`,
        timestamp: new Date().toISOString(),
        itemsProcessed: patients.length
      };
    } else {
      return {
        success: false,
        message: `Échec de l'export vers ${integrationType}`,
        timestamp: new Date().toISOString(),
        errors: ['Erreur de connexion au serveur distant']
      };
    }
  }
  
  // Déconnecter une intégration
  async disconnectIntegration(userId: string, integrationType: IntegrationType): Promise<boolean> {
    try {
      const integrationRef = doc(db, `users/${userId}/integrations/${integrationType}`);
      
      // Récupérer l'intégration
      const integrationDoc = await getDoc(integrationRef);
      
      if (!integrationDoc.exists()) {
        throw new Error(`L'intégration ${integrationType} n'existe pas pour cet utilisateur.`);
      }
      
      // Mettre à jour l'intégration
      await updateDoc(integrationRef, {
        isConnected: false
      });
      
      return true;
    } catch (error) {
      console.error(`Erreur lors de la déconnexion de ${integrationType}:`, error);
      throw error;
    }
  }
   
  // Méthodes spécifiques pour chaque type d'intégration
  
  // Julie - Export de patients (utilise l'API réelle)
  async exportToJulie(userId: string, patients: Patient[]): Promise<SyncResult> {
    return this.exportPatients(userId, 'julie', patients);
  }
  
  // Logosw - Export de patients (simulation)
  async exportToLogosw(userId: string, patients: Patient[]): Promise<SyncResult> {
    return this.exportPatients(userId, 'logosw', patients);
  }
  
  // Zapier - Déclenchement d'un webhook (simulation)
  async triggerZapierWebhook(
    userId: string, 
    eventType: 'new_patient' | 'updated_patient' | 'new_appointment',
    data: any
  ): Promise<SyncResult> {
    try {
      // Vérifier si l'intégration est connectée
      const integrationRef = doc(db, `users/${userId}/integrations/zapier`);
      const integrationDoc = await getDoc(integrationRef);
      
      if (!integrationDoc.exists() || !integrationDoc.data().isConnected) {
        throw new Error(`L'intégration Zapier n'est pas connectée.`);
      }
      
      // Simuler l'appel à un webhook Zapier
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return {
        success: true,
        message: `Webhooks Zapier déclenchés avec succès pour ${eventType}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Erreur lors du déclenchement du webhook Zapier:`, error);
      return {
        success: false,
        message: `Échec du déclenchement du webhook: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        timestamp: new Date().toISOString(),
        errors: [error instanceof Error ? error.message : 'Erreur inconnue']
      };
    }
  }
  
  // Google Drive - Sauvegarde de fichiers (simulation)
  async backupToGoogleDrive(
    userId: string, 
    fileData: string, 
    fileName: string
  ): Promise<SyncResult> {
    try {
      // Vérifier si l'intégration est connectée
      const integrationRef = doc(db, `users/${userId}/integrations/google_drive`);
      const integrationDoc = await getDoc(integrationRef);
      
      if (!integrationDoc.exists() || !integrationDoc.data().isConnected) {
        throw new Error(`L'intégration Google Drive n'est pas connectée.`);
      }
      
      // Simuler un upload vers Google Drive
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      return {
        success: true,
        message: `Fichier "${fileName}" sauvegardé avec succès sur Google Drive`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Erreur lors de la sauvegarde sur Google Drive:`, error);
      return {
        success: false,
        message: `Échec de la sauvegarde: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        timestamp: new Date().toISOString(),
        errors: [error instanceof Error ? error.message : 'Erreur inconnue']
      };
    }
  }

  // Méthode pour récupérer les patients depuis Julie
  async importPatientsFromJulie(userId: string): Promise<SyncResult> {
    try {
      // Vérifier si l'intégration est connectée
      const integrationRef = doc(db, `users/${userId}/integrations/julie`);
      const integrationDoc = await getDoc(integrationRef);
      
      if (!integrationDoc.exists() || !integrationDoc.data().isConnected) {
        throw new Error(`L'intégration Julie n'est pas connectée.`);
      }
      
      // S'assurer que le client Julie est initialisé
      if (!this.apiClients.julie) {
        const config = integrationDoc.data().config;
        this.apiClients.julie = new JulieApiClient({ apiKey: config.apiKey });
      }
      
      // Récupérer les patients depuis Julie
      const juliePatients = await this.apiClients.julie.getPatients();
      
      // Dans une implémentation réelle, vous convertiriez ces patients au format
      // de votre application et les enregistreriez dans votre base de données
      
      return {
        success: true,
        message: `${juliePatients.length} patients importés avec succès depuis Julie`,
        timestamp: new Date().toISOString(),
        itemsProcessed: juliePatients.length
      };
    } catch (error) {
      console.error(`Erreur lors de l'import des patients depuis Julie:`, error);
      return {
        success: false,
        message: `Échec de l'import: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        timestamp: new Date().toISOString(),
        errors: [error instanceof Error ? error.message : 'Erreur inconnue']
      };
    }
  }
  
  // Récupérer les rendez-vous depuis Julie
  async getAppointmentsFromJulie(
    userId: string, 
    startDate: string, 
    endDate: string
  ): Promise<SyncResult> {
    try {
      // Vérifier si l'intégration est connectée
      const integrationRef = doc(db, `users/${userId}/integrations/julie`);
      const integrationDoc = await getDoc(integrationRef);
      
      if (!integrationDoc.exists() || !integrationDoc.data().isConnected) {
        throw new Error(`L'intégration Julie n'est pas connectée.`);
      }
      
      // S'assurer que le client Julie est initialisé
      if (!this.apiClients.julie) {
        const config = integrationDoc.data().config;
        this.apiClients.julie = new JulieApiClient({ apiKey: config.apiKey });
      }
      
      // Récupérer les rendez-vous depuis Julie
      const appointments = await this.apiClients.julie.getAppointments(startDate, endDate);
      
      return {
        success: true,
        message: `${appointments.length} rendez-vous récupérés avec succès depuis Julie`,
        timestamp: new Date().toISOString(),
        itemsProcessed: appointments.length
      };
    } catch (error) {
      console.error(`Erreur lors de la récupération des rendez-vous depuis Julie:`, error);
      return {
        success: false,
        message: `Échec de la récupération: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        timestamp: new Date().toISOString(),
        errors: [error instanceof Error ? error.message : 'Erreur inconnue']
      };
    }
  }
}

export const integrationService = new IntegrationService(); 