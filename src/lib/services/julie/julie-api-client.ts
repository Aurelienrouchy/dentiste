import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ExportablePatient, SyncResult } from '@/lib/types/integration';

// Configuration pour l'API Julie
interface JulieApiConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

// Interface pour les réponses de l'API Julie
interface JulieApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Client pour l'API Julie
 * Cette classe gère les communications avec l'API Julie pour la synchronisation des données
 */
export class JulieApiClient {
  private apiClient: AxiosInstance;
  private apiKey: string;
  
  constructor(config: JulieApiConfig) {
    this.apiKey = config.apiKey;
    
    // Configuration de l'instance axios
    this.apiClient = axios.create({
      baseURL: config.baseUrl || 'https://api.julie.fr/v1',
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': this.apiKey
      }
    });
    
    // Intercepteur pour gérer les erreurs
    this.apiClient.interceptors.response.use(
      response => response,
      error => {
        console.error('Erreur API Julie:', error.response?.data || error.message);
        throw error;
      }
    );
  }
  
  /**
   * Vérifie si la connexion à l'API Julie est fonctionnelle
   * @returns {Promise<boolean>} True si la connexion est établie avec succès
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.apiClient.get<JulieApiResponse<{ status: string }>>('/status');
      return response.data.success && response.data.data?.status === 'active';
    } catch (error) {
      console.error('Erreur lors du test de connexion à Julie:', error);
      return false;
    }
  }
  
  /**
   * Convertit un patient au format Julie
   * @param {ExportablePatient} patient Patient au format exportable
   * @returns {Object} Patient au format Julie
   */
  private formatPatientForJulie(patient: ExportablePatient): any {
    // Format spécifique pour Julie
    const [year, month, day] = patient.birthDate.split('-');
    
    return {
      external_id: patient.id,
      civility: patient.gender === 'Madame' ? 'Mme' : patient.gender === 'Monsieur' ? 'M' : '',
      last_name: patient.fullName.split(' ').slice(0, 1).join(' '),
      first_name: patient.fullName.split(' ').slice(1).join(' '),
      birth_date: {
        day: parseInt(day),
        month: parseInt(month),
        year: parseInt(year)
      },
      contact: {
        email: patient.email,
        phone: patient.phoneNumber
      },
      metadata: {
        created_at: patient.createdAt,
        last_update: patient.lastVisit || patient.createdAt
      }
    };
  }
  
  /**
   * Exporte les patients vers Julie
   * @param {ExportablePatient[]} patients Liste des patients à exporter
   * @returns {Promise<SyncResult>} Résultat de la synchronisation
   */
  async exportPatients(patients: ExportablePatient[]): Promise<SyncResult> {
    try {
      const formattedPatients = patients.map(this.formatPatientForJulie);
      
      const response = await this.apiClient.post<JulieApiResponse<{ imported: number }>>('/patients/import', {
        patients: formattedPatients,
        options: {
          update_existing: true
        }
      });
      
      if (response.data.success) {
        return {
          success: true,
          message: `${response.data.data?.imported || patients.length} patients exportés avec succès vers Julie`,
          timestamp: new Date().toISOString(),
          itemsProcessed: response.data.data?.imported || patients.length
        };
      } else {
        throw new Error(response.data.error?.message || 'Échec de l\'export vers Julie');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue lors de l\'export vers Julie';
      console.error('Erreur lors de l\'export des patients vers Julie:', errorMessage);
      
      return {
        success: false,
        message: `Échec de l'export: ${errorMessage}`,
        timestamp: new Date().toISOString(),
        errors: [errorMessage]
      };
    }
  }
  
  /**
   * Récupère les patients depuis Julie
   * @param {number} limit Nombre maximum de patients à récupérer
   * @param {number} offset Décalage pour la pagination
   * @returns {Promise<any[]>} Liste des patients
   */
  async getPatients(limit: number = 100, offset: number = 0): Promise<any[]> {
    try {
      const response = await this.apiClient.get<JulieApiResponse<{ patients: any[] }>>('/patients', {
        params: { limit, offset }
      });
      
      if (response.data.success) {
        return response.data.data?.patients || [];
      } else {
        throw new Error(response.data.error?.message || 'Échec de la récupération des patients depuis Julie');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des patients depuis Julie:', error);
      throw error;
    }
  }
  
  /**
   * Récupère les rendez-vous depuis Julie
   * @param {string} startDate Date de début (YYYY-MM-DD)
   * @param {string} endDate Date de fin (YYYY-MM-DD)
   * @returns {Promise<any[]>} Liste des rendez-vous
   */
  async getAppointments(startDate: string, endDate: string): Promise<any[]> {
    try {
      const response = await this.apiClient.get<JulieApiResponse<{ appointments: any[] }>>('/appointments', {
        params: { start_date: startDate, end_date: endDate }
      });
      
      if (response.data.success) {
        return response.data.data?.appointments || [];
      } else {
        throw new Error(response.data.error?.message || 'Échec de la récupération des rendez-vous depuis Julie');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des rendez-vous depuis Julie:', error);
      throw error;
    }
  }
} 