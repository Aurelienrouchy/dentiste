import { useState, useEffect } from 'react';
import { useAIService, DocumentConfig } from '../services/ai.service';
import { TemplateService, DocumentTemplate } from '../services/template.service';
import { useAuth } from '@/lib/hooks/useAuth';

export interface Document {
  id: string;
  patientId: string;
  patientName: string;
  title: string;
  type: string; // compte-rendu-operatoire, ordonnance, etc.
  content: string;
  createdAt: Date;
  practitionerId?: string;
  practitionerName?: string;
}

export type DocumentType = {
  id: string;
  title: string;
  description: string;
};

export const documentTypes: DocumentType[] = [
  {
    id: 'compte-rendu-operatoire',
    title: 'Compte-rendu opératoire',
    description: 'Grâce à une dictée de votre chirurgie, Assisdent génère un compte rendu lisible et détaillé, répondant aux impératifs médico-légaux.'
  },
  {
    id: 'courrier-confrere',
    title: 'Courrier confrère/consoeur',
    description: 'Donnez seulement les éléments importants et Assisdent génère un courrier scientifique et confraternel, sans faute d\'orthographe.'
  },
  {
    id: 'compte-rendu-cone-beam',
    title: 'Compte-rendu cone beam',
    description: 'Dictez les éléments de votre cone beam, Assisdent génère un document complet conforme à la réglementation en cas de contrôle.'
  },
  {
    id: 'courrier-patient',
    title: 'Courrier Patient',
    description: 'Dictez les éléments important et Assisdent réalise un courrier légèrement vulgarisé et professionnel pour votre patient(e).'
  },
  {
    id: 'ordonnance',
    title: 'Ordonnance',
    description: 'Générez des ordonnances claires et au format règlementaire en quelques secondes.'
  },
  {
    id: 'certificat-medical-initial',
    title: 'Certificat médical initial',
    description: 'Donnez rapidement l\'état de santé initial de vos patients et obtenez un certificat conforme aux normes médico-légales.'
  },
  {
    id: 'certificat-medical-presence',
    title: 'Certificat médical de présence',
    description: 'Indiquez simplement les informations de présence nécessaires, et Assisdent génère un certificat clair et conforme, prêt à être remis au patient ou à une institution.'
  },
  {
    id: 'certificat-medical-contre-indication',
    title: 'Certificat médical de contre-indication',
    description: 'Spécifiez les raisons médicales empêchant un patient de pratiquer une activité et obtenez un certificat conforme aux exigences réglementaires.'
  },
  {
    id: 'fiche-laboratoire',
    title: 'Fiche de laboratoire',
    description: 'Dictez votre demande et Assisdent génère une fiche de laboratoire anonymisée, claire et précise, prête à être remise à votre laboratoire.'
  }
];

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customTemplates, setCustomTemplates] = useState<DocumentTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  
  const { user } = useAuth();
  const aiService = useAIService();
  
  // Charger les templates personnalisés
  useEffect(() => {
    if (!user) return;
    
    const loadTemplates = async () => {
      try {
        setIsLoadingTemplates(true);
        const templates = await TemplateService.getTemplates(user.uid);
        setCustomTemplates(templates);
      } catch (err) {
        console.error('Erreur lors du chargement des templates:', err);
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    
    loadTemplates();
  }, [user]);
  
  // Obtenir tous les types de documents, y compris les templates personnalisés
  const getAllDocumentTypes = () => {
    const customDocTypes = customTemplates.map(template => ({
      id: `template_${template.id}`,
      title: template.title,
      description: template.description,
      isCustomTemplate: true,
      templateId: template.id
    }));
    
    return [...documentTypes, ...customDocTypes];
  };
  
  // Générer un document à partir d'une transcription
  const generateDocument = async (
    patientId: string,
    patientName: string,
    documentType: string,
    transcript: string,
    modelId: string = 'gpt4',
    practitionerName?: string
  ): Promise<Document | null> => {
    try {
      setIsGenerating(true);
      setError(null);
      
      if (!transcript) {
        throw new Error('Aucune transcription disponible');
      }
      
      // Vérifier si c'est un template personnalisé
      const isCustomTemplate = documentType.startsWith('template_');
      let content = '';
      let docTypeTitle = '';
      
      if (isCustomTemplate) {
        // Obtenir le template personnalisé
        const templateId = documentType.replace('template_', '');
        const template = customTemplates.find(t => t.id === templateId);
        
        if (!template) {
          throw new Error('Template introuvable');
        }
        
        docTypeTitle = template.title;
        
        // Configurer le document
        const config: DocumentConfig = {
          type: 'custom_template',
          patientId,
          patientName,
          practitionerName,
          date: new Date().toLocaleDateString()
        };
        
        // Générer le document avec l'IA et le template personnalisé
        content = await aiService.generateDocument(config, modelId, template.content);
        
      } else {
        // Utiliser le type de document standard
        const config: DocumentConfig = {
          type: documentType,
          patientId,
          patientName,
          practitionerName,
          date: new Date().toLocaleDateString()
        };
        
        // Générer le document avec l'IA
        content = await aiService.generateDocument(config, modelId);
        
        const docType = documentTypes.find(dt => dt.id === documentType);
        if (!docType) {
          throw new Error('Type de document introuvable');
        }
        docTypeTitle = docType.title;
      }
      
      if (!content) {
        throw new Error('Erreur lors de la génération du document');
      }
      
      // Créer un nouvel objet document
      const newDocument: Document = {
        id: Date.now().toString(), // ID temporaire
        patientId,
        patientName,
        title: `${docTypeTitle} - ${patientName}`,
        type: documentType,
        content,
        createdAt: new Date(),
        practitionerId: user?.uid || '1',
        practitionerName
      };
      
      // Ajouter le document à la liste
      setDocuments(prev => [newDocument, ...prev]);
      setSelectedDocument(newDocument);
      
      setIsGenerating(false);
      return newDocument;
      
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération du document');
      setIsGenerating(false);
      return null;
    }
  };
  
  // Sauvegarder un document (simulé pour l'exemple)
  const saveDocument = async (document: Document): Promise<boolean> => {
    try {
      // Simuler une sauvegarde dans une base de données
      console.log('Saving document:', document);
      
      // Dans une implémentation réelle, nous sauvegarderions le document dans Firestore
      // await addDoc(collection(db, 'documents'), document);
      
      return true;
    } catch (err) {
      console.error(err);
      setError('Erreur lors de la sauvegarde du document');
      return false;
    }
  };
  
  // Télécharger un document au format PDF (simulé pour l'exemple)
  const downloadDocument = (document: Document): void => {
    try {
      console.log('Downloading document:', document);
      
      // Pour l'exemple, nous allons simplement créer un blob avec le contenu
      const blob = new Blob([document.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${document.title}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error(err);
      setError('Erreur lors du téléchargement du document');
    }
  };
  
  // Simuler le chargement des documents archivés
  const getArchivedDocuments = async (patientId?: string): Promise<Document[]> => {
    // Simuler un délai pour l'appel API
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Exemples de documents
    const mockDocuments: Document[] = [
      {
        id: '1',
        patientId: '1',
        patientName: 'Jean Dupont',
        title: 'Compte-rendu opératoire - Jean Dupont',
        type: 'compte-rendu-operatoire',
        content: 'Contenu du compte-rendu opératoire...',
        createdAt: new Date(2024, 2, 1),
        practitionerId: '1',
        practitionerName: 'Dr. Exemple'
      },
      {
        id: '2',
        patientId: '2',
        patientName: 'Marie Martin',
        title: 'Ordonnance - Marie Martin',
        type: 'ordonnance',
        content: 'Contenu de l\'ordonnance...',
        createdAt: new Date(2024, 1, 28),
        practitionerId: '1',
        practitionerName: 'Dr. Exemple'
      },
      {
        id: '3',
        patientId: '3',
        patientName: 'Philippe Petit',
        title: 'Certificat médical - Philippe Petit',
        type: 'certificat-medical-presence',
        content: 'Contenu du certificat médical...',
        createdAt: new Date(2024, 1, 25),
        practitionerId: '1',
        practitionerName: 'Dr. Exemple'
      }
    ];
    
    // Filtrer par patient si nécessaire
    const filteredDocs = patientId 
      ? mockDocuments.filter(doc => doc.patientId === patientId)
      : mockDocuments;
    
    setDocuments(filteredDocs);
    return filteredDocs;
  };
  
  return {
    // État
    documents,
    selectedDocument,
    isGenerating,
    error,
    documentTypes: getAllDocumentTypes(),
    customTemplates,
    isLoadingTemplates,
    
    // Actions
    generateDocument,
    saveDocument,
    downloadDocument,
    getArchivedDocuments,
    setSelectedDocument,
    
    // Services d'IA
    aiService
  };
} 