// Types pour les intégrations externes
export type IntegrationType = 
  | 'julie' 
  | 'logosw' 
  | 'zapier' 
  | 'weclever' 
  | 'veasy' 
  | 'google_drive';

// Statut de disponibilité de l'intégration
export type IntegrationStatus = 
  | 'available'      // Disponible
  | 'coming_soon'    // Bientôt disponible
  | 'not_available'; // Pas encore disponible

// Interface pour un patient exporté (format générique)
export interface ExportablePatient {
  id: string;
  fullName: string;
  gender: string;
  birthDate: string;
  email?: string;
  phoneNumber?: string;
  createdAt: string;
  lastVisit?: string;
}

// Structure de base pour toutes les intégrations
export interface Integration {
  id: IntegrationType;
  name: string;
  description: string;
  logoUrl: string;
  status: IntegrationStatus;
  isConnected: boolean;
  lastSyncDate?: string;
}

// Configuration spécifique pour chaque type d'intégration
export interface IntegrationConfig {
  apiKey?: string;
  refreshToken?: string;
  syncFrequency?: 'daily' | 'weekly' | 'manual';
  exportFormat?: 'json' | 'csv' | 'xml';
  syncPatients?: boolean;
  syncAppointments?: boolean;
  syncTreatments?: boolean;
}

// Résultats d'une opération d'export ou d'import
export interface SyncResult {
  success: boolean;
  message: string;
  timestamp: string;
  itemsProcessed?: number;
  errors?: string[];
} 