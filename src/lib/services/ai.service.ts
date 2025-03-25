import { useState, useEffect, useRef } from "react";

export interface AIModel {
  id: string;
  name: string;
  description: string;
  typeNatif: "audio" | "texte" | "multimodal";
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
}

export interface DocumentConfig {
  type: string;
  patientId: string;
  patientName: string;
  practitionerName?: string;
  date?: string;
  additionalFields?: Record<string, unknown>;
}

// Variables de configuration
let OPENAI_API_KEY: string | null = null;

// Chargement de la clé API à partir de l'environnement
try {
  OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || null;
} catch (e) {
  console.error("Error loading OpenAI API key from environment:", e);
}

class AIService {
  private availableModels: AIModel[] = [
    {
      id: "whisper",
      name: "OpenAI Whisper",
      description:
        "Modèle de reconnaissance vocale performant pour la transcription audio",
      typeNatif: "audio",
    },
    {
      id: "gpt4",
      name: "GPT-4",
      description:
        "Analyse les transcriptions et génère des documents médicaux structurés",
      typeNatif: "texte",
    },
    {
      id: "gpt4o",
      name: "GPT-4o",
      description: "Modèle multimodal pouvant traiter le texte et l'audio",
      typeNatif: "multimodal",
    },
    {
      id: "claude3",
      name: "Anthropic Claude 3",
      description:
        "Modèle d'IA conçu pour respecter les protocoles médicaux et la confidentialité",
      typeNatif: "texte",
    },
    {
      id: "gemini",
      name: "Google Gemini",
      description:
        "Modèle avancé de Google pour le traitement du langage naturel médical",
      typeNatif: "multimodal",
    },
  ];

  private mobileSessions: Map<
    string,
    {
      audioBlob: Blob | null;
      timestamp: number;
    }
  > = new Map();

  constructor() {
    // Initialisation des modèles
    console.log("AIService initialized with environment API key");

    // Vérifier que la clé API est configurée
    if (!this.hasApiKey()) {
      console.warn("OpenAI API key is not configured in environment variables");
    }
  }

  /**
   * Vérifie si une clé API est configurée
   */
  hasApiKey(): boolean {
    return !!OPENAI_API_KEY;
  }

  /**
   * Récupère tous les modèles d'IA disponibles
   */
  getAvailableModels(): AIModel[] {
    return this.availableModels;
  }

  /**
   * Récupère les modèles disponibles pour la transcription audio
   */
  getTranscriptionModels(): AIModel[] {
    return this.availableModels.filter(
      (model) => model.typeNatif === "audio" || model.typeNatif === "multimodal"
    );
  }

  /**
   * Récupère les modèles disponibles pour la génération de documents
   */
  getDocumentModels(): AIModel[] {
    return this.availableModels.filter(
      (model) => model.typeNatif === "texte" || model.typeNatif === "multimodal"
    );
  }

  /**
   * Démarre l'enregistrement audio via le microphone
   * @returns Un objet MediaRecorder pour gérer l'enregistrement
   */
  async startSpeechRecognition(): Promise<MediaRecorder> {
    try {
      console.log("Starting speech recognition...");

      // Demander l'accès au microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Créer un MediaRecorder avec les options audio optimisées pour la reconnaissance vocale
      const options = { mimeType: "audio/webm" };
      const mediaRecorder = new MediaRecorder(stream, options);

      return mediaRecorder;
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      throw new Error(
        "Impossible d'accéder au microphone. Veuillez vérifier les permissions."
      );
    }
  }

  /**
   * Transcrit un enregistrement audio en utilisant l'API Whisper d'OpenAI
   * @param audioBlob Enregistrement audio à transcrire
   * @param modelId ID du modèle à utiliser pour la transcription
   * @returns Résultat de la transcription
   */
  async transcribeAudio(
    audioBlob: Blob,
    modelId: string
  ): Promise<TranscriptionResult> {
    try {
      console.log(`Transcribing audio with model ${modelId}...`);

      // Vérifier si nous avons une clé API
      if (!OPENAI_API_KEY) {
        throw new Error(
          "Clé API OpenAI non configurée dans les variables d'environnement."
        );
      }

      // Créer un FormData pour envoyer l'audio à l'API Whisper
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");
      formData.append("model", "whisper-1");
      formData.append("language", "fr"); // Spécifier le français pour de meilleurs résultats

      // Appeler l'API Whisper d'OpenAI
      const response = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `API error: ${errorData.error?.message || response.statusText}`
        );
      }

      const data = await response.json();
      return {
        text: data.text,
        confidence: 0.95, // Whisper ne retourne pas de score de confiance, nous utilisons une valeur par défaut
      };
    } catch (error) {
      console.error("Error transcribing audio:", error);
      throw new Error(
        "Erreur lors de la transcription audio. Veuillez réessayer."
      );
    }
  }

  /**
   * Génère un document à partir d'une transcription en utilisant GPT-4
   * @param config Configuration du document
   * @param modelId ID du modèle à utiliser pour la génération
   * @param templateContent Contenu du template personnalisé (optionnel)
   * @returns Document généré
   */
  async generateDocument(
    config: DocumentConfig,
    modelId: string,
    templateContent?: string
  ): Promise<string> {
    try {
      console.log(`Generating document with model ${modelId}...`);

      // Vérifier si nous avons une clé API
      if (!OPENAI_API_KEY) {
        throw new Error(
          "Clé API OpenAI non configurée dans les variables d'environnement."
        );
      }

      // Préparer le prompt pour GPT-4 selon le type de document ou utiliser le template personnalisé
      let systemPrompt = "";

      if (templateContent) {
        // Utiliser le template personnalisé
        systemPrompt = `Vous êtes un assistant spécialisé dans la création de documents médicaux dentaires professionnels.
        Générez un document basé sur le template et la transcription fournis.
        Format: professionnel, précis, conforme aux standards médicaux.
        Patient: ${config.patientName || "Patient"}
        Praticien: ${config.practitionerName || "Dr. Exemple"}
        Date: ${config.date || new Date().toLocaleDateString()}
        
        Voici le template à utiliser (remplacez les variables entre crochets par les informations appropriées):
        ${templateContent}`;
      } else {
        // Utiliser le type de document standard
        systemPrompt = `Vous êtes un assistant spécialisé dans la création de documents médicaux dentaires professionnels. 
        Générez un document de type ${config.type.replace(
          /-/g,
          " "
        )} basé sur la transcription fournie.
        Format: professionnel, précis, conforme aux standards médicaux.
        Patient: ${config.patientName || "Patient"}
        Praticien: ${config.practitionerName || "Dr. Exemple"}
        Date: ${config.date || new Date().toLocaleDateString()}`;

        // Ajouter des instructions spécifiques selon le type de document
        switch (config.type) {
          case "compte-rendu-operatoire":
            systemPrompt += `\nStructure du document:
            - Titre: COMPTE-RENDU OPÉRATOIRE
            - Date et informations du patient/praticien
            - ACTE RÉALISÉ: description concise de l'acte
            - DÉROULEMENT: détails de l'intervention
            - SUITES OPÉRATOIRES: prescriptions et suivi
            - Signature du praticien`;
            break;
          case "ordonnance":
            systemPrompt += `\nStructure du document:
            - Titre: ORDONNANCE
            - Date et informations du patient/praticien
            - Liste des médicaments avec posologie
            - Recommandations importantes
            - Signature du praticien`;
            break;
          case "certificat-medical-presence":
            systemPrompt += `\nStructure du document:
            - Titre: CERTIFICAT MÉDICAL DE PRÉSENCE
            - Formule "Je soussigné(e), [praticien], certifie avoir reçu en consultation [patient] le [date]."
            - Mention légale
            - Signature du praticien`;
            break;
        }
      }

      // Appeler l'API GPT-4 d'OpenAI
      const apiEndpoint =
        modelId === "gpt4o" ? "gpt-4o-2024-05-13" : "gpt-4-turbo-preview";

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: apiEndpoint,
            messages: [
              {
                role: "system",
                content: systemPrompt,
              },
              {
                role: "user",
                content:
                  "Voici ma transcription: " +
                  (typeof document.getElementById === "function"
                    ? document.getElementById("transcription")?.innerText
                    : ""),
              },
            ],
            temperature: 0.3,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `API error: ${errorData.error?.message || response.statusText}`
        );
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("Error generating document:", error);
      throw new Error(
        "Erreur lors de la génération du document. Veuillez réessayer."
      );
    }
  }

  /**
   * Crée une nouvelle session d'enregistrement mobile
   * @returns ID de la session
   */
  createMobileSession(): string {
    const sessionId = Math.random().toString(36).substring(2, 15);
    this.mobileSessions.set(sessionId, {
      audioBlob: null,
      timestamp: Date.now(),
    });
    return sessionId;
  }

  /**
   * Stocke l'audio enregistré depuis le mobile
   * @param sessionId ID de la session
   * @param audioBlob Blob audio à stocker
   */
  storeMobileAudio(sessionId: string, audioBlob: Blob): void {
    const session = this.mobileSessions.get(sessionId);
    if (session) {
      session.audioBlob = audioBlob;
      session.timestamp = Date.now();
    }
  }

  /**
   * Récupère l'audio enregistré depuis le mobile
   * @param sessionId ID de la session
   * @returns Blob audio ou null si non trouvé
   */
  getMobileAudio(sessionId: string): Blob | null {
    const session = this.mobileSessions.get(sessionId);
    if (session && session.audioBlob) {
      const audioBlob = session.audioBlob;
      // Nettoyer la session après récupération
      this.mobileSessions.delete(sessionId);
      return audioBlob;
    }
    return null;
  }

  /**
   * Vérifie si une session mobile existe et est valide
   * @param sessionId ID de la session
   * @returns boolean
   */
  isValidMobileSession(sessionId: string): boolean {
    const session = this.mobileSessions.get(sessionId);
    if (!session) return false;

    // La session expire après 5 minutes
    const isExpired = Date.now() - session.timestamp > 5 * 60 * 1000;
    if (isExpired) {
      this.mobileSessions.delete(sessionId);
      return false;
    }

    return true;
  }
}

// Créer une instance unique du service
export const aiService = new AIService();

/**
 * Hook React pour utiliser le service d'IA
 */
export function useAIService() {
  // État local
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [transcript, setTranscript] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Références pour l'enregistrement audio
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Réinitialiser les erreurs quand l'état change
  useEffect(() => {
    if (isRecording || isProcessing) {
      setError(null);
    }
  }, [isRecording, isProcessing]);

  // Timer pour l'enregistrement
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Nettoyage lors du démontage du composant
  useEffect(() => {
    return () => {
      // Arrêter l'enregistrement et libérer les ressources
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isRecording]);

  // Formater le temps d'enregistrement
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Démarrer l'enregistrement audio
  const startRecording = async (): Promise<void> => {
    try {
      setIsRecording(true);
      audioChunksRef.current = [];

      const mediaRecorder = await aiService.startSpeechRecognition();
      mediaRecorderRef.current = mediaRecorder;

      // Stocker le stream pour pouvoir le nettoyer plus tard
      if (mediaRecorder.stream) {
        streamRef.current = mediaRecorder.stream;
      }

      // Configurer les écouteurs d'événements
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Démarrer l'enregistrement
      mediaRecorder.start(1000); // Collecter les données toutes les secondes
      console.log("Recording started");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de démarrer l'enregistrement"
      );
      setIsRecording(false);
      console.error(err);
    }
  };

  // Arrêter l'enregistrement et transcrire
  const stopRecording = async (modelId: string = "whisper"): Promise<void> => {
    try {
      if (!mediaRecorderRef.current) {
        throw new Error("Aucun enregistrement en cours");
      }

      setIsRecording(false);
      setIsProcessing(true);

      // Créer une promesse qui sera résolue quand l'enregistrement s'arrête
      const recordingStoppedPromise = new Promise<void>((resolve) => {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.onstop = () => resolve();
          mediaRecorderRef.current.stop();

          // Libérer les ressources du microphone
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }
        } else {
          resolve();
        }
      });

      // Attendre que l'enregistrement s'arrête
      await recordingStoppedPromise;

      // Vérifier si nous avons des données audio
      if (audioChunksRef.current.length === 0) {
        throw new Error("Aucune donnée audio enregistrée");
      }

      // Combiner les chunks audio en un seul Blob
      const audioBlob = new Blob(audioChunksRef.current, {
        type: "audio/webm",
      });

      // Transcription de l'audio
      const result = await aiService.transcribeAudio(audioBlob, modelId);
      setTranscript(result.text);

      setIsProcessing(false);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la transcription"
      );
      setIsProcessing(false);
      console.error(err);
    }
  };

  // Générer un document à partir de la transcription
  const generateDocument = async (
    config: DocumentConfig,
    modelId: string = "gpt4",
    templateContent?: string
  ): Promise<string> => {
    try {
      setIsProcessing(true);

      if (!transcript) {
        throw new Error("Aucune transcription disponible");
      }

      const document = await aiService.generateDocument(
        config,
        modelId,
        templateContent
      );

      setIsProcessing(false);
      return document;
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la génération du document"
      );
      setIsProcessing(false);
      console.error(err);
      return "";
    }
  };

  // Réinitialiser la transcription
  const resetTranscript = (): void => {
    setTranscript("");
  };

  return {
    // État
    isRecording,
    recordingTime,
    transcript,
    isProcessing,
    error,

    // Actions
    startRecording,
    stopRecording,
    generateDocument,
    resetTranscript,
    formatTime,
    hasApiKey: () => aiService.hasApiKey(),
    transcribeAudio: (audioBlob: Blob, modelId: string) =>
      aiService.transcribeAudio(audioBlob, modelId),

    // Services
    getAvailableModels: () => aiService.getAvailableModels(),
    getTranscriptionModels: () => aiService.getTranscriptionModels(),
    getDocumentModels: () => aiService.getDocumentModels(),
  };
}
