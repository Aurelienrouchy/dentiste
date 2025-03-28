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

    // Restaurer les sessions depuis localStorage si disponible
    this.loadSessionsFromStorage();
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

      // Vérifier si le navigateur supporte getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("getUserMedia n'est pas supporté par ce navigateur");
        throw new Error(
          "Votre navigateur ne supporte pas l'enregistrement audio"
        );
      }

      // Optimisation pour iOS - Safari a une implémentation particulière
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /Safari/.test(navigator.userAgent);

      console.log("Détection plateforme:", { isIOS, isSafari });

      // Contraintes audio spécifiques à la plateforme
      const constraints: MediaStreamConstraints = {
        audio: isIOS
          ? true // iOS fonctionne mieux avec des contraintes simples
          : {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              // Qualité vocale pour les mobiles (économise la batterie et la bande passante)
              sampleRate: 16000,
              channelCount: 1,
            },
      };

      console.log(
        "Demande d'accès au microphone avec contraintes:",
        constraints
      );

      // Demander l'accès au microphone
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Accès au microphone accordé");

      // Vérifier les types MIME supportés pour maximiser la compatibilité
      // L'ordre est important - tester d'abord les plus largement supportés
      const mimeTypes = [
        "audio/webm", // Chrome, Firefox, Edge
        "audio/mp4", // Safari
        "audio/ogg;codecs=opus", // Firefox
        "audio/wav", // Fallback
      ];

      let selectedMimeType = "";

      // Tester chaque type MIME dans l'ordre
      for (const type of mimeTypes) {
        try {
          if (MediaRecorder.isTypeSupported(type)) {
            selectedMimeType = type;
            console.log(`Type MIME supporté trouvé: ${type}`);
            break;
          }
        } catch (e) {
          console.warn(`Erreur lors du test du type MIME ${type}:`, e);
        }
      }

      console.log(
        "Type MIME utilisé:",
        selectedMimeType || "format par défaut du navigateur"
      );

      // Options de l'enregistreur avec fallback pour iOS
      const options: MediaRecorderOptions = {};

      if (selectedMimeType) {
        options.mimeType = selectedMimeType;
      }

      // Bitrate audio plus bas pour les mobiles
      if (!isIOS) {
        // iOS ne supporte pas cette option
        try {
          options.audioBitsPerSecond = 16000;
        } catch (e) {
          console.warn("audioBitsPerSecond n'est pas supporté", e);
        }
      }

      console.log("Création du MediaRecorder avec options:", options);

      // Créer le MediaRecorder avec gestion spéciale pour iOS
      let mediaRecorder: MediaRecorder;

      try {
        mediaRecorder = new MediaRecorder(stream, options);
        console.log("MediaRecorder créé avec succès");
      } catch (error) {
        console.error("Erreur lors de la création du MediaRecorder:", error);

        // Réessayer sans options pour iOS Safari
        if (isIOS && isSafari) {
          console.log(
            "Réessai de création du MediaRecorder sans options pour iOS Safari"
          );
          mediaRecorder = new MediaRecorder(stream);
        } else {
          throw error;
        }
      }

      // Configuration spéciale pour certaines versions de Safari
      if (isIOS && isSafari) {
        console.log("Configuration spéciale pour Safari iOS");

        // S'assurer que le timeslice est configuré (requis sur certains Safari)
        const originalStart = mediaRecorder.start;
        mediaRecorder.start = function (timeslice?: number) {
          return originalStart.call(this, timeslice || 1000);
        };
      }

      console.log("MediaRecorder configuré et prêt:", mediaRecorder);
      return mediaRecorder;
    } catch (error) {
      console.error(
        "Erreur détaillée lors du démarrage de la reconnaissance vocale:",
        error
      );

      // Gestion plus précise des erreurs par type
      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          throw new Error(
            "L'accès au microphone a été refusé. Veuillez autoriser l'accès dans les paramètres de votre navigateur."
          );
        } else if (error.name === "NotFoundError") {
          throw new Error(
            "Aucun microphone n'a été trouvé. Veuillez connecter un microphone et réessayer."
          );
        } else if (error.name === "NotReadableError") {
          throw new Error(
            "Le microphone est déjà utilisé par une autre application. Veuillez fermer cette application et réessayer."
          );
        } else if (error.name === "SecurityError") {
          throw new Error(
            "Erreur de sécurité: l'accès au microphone n'est pas autorisé dans ce contexte. Assurez-vous d'être en HTTPS."
          );
        } else if (error.name === "AbortError") {
          throw new Error(
            "L'accès au microphone a été annulé. Veuillez réessayer."
          );
        } else if (
          error.name === "TypeError" &&
          /iOS|iPhone|iPad|iPod/.test(navigator.userAgent)
        ) {
          throw new Error(
            "Safari iOS peut nécessiter des paramètres spéciaux. Allez dans Réglages > Safari > Paramètres avancés et activez l'option 'Fonctionnalités web expérimentales'."
          );
        }
      }

      throw new Error(
        `Impossible d'accéder au microphone. Erreur: ${
          error instanceof Error ? error.message : "inconnue"
        }`
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
    // Générer un ID de session aléatoire mais lisible
    const sessionId =
      Math.random().toString(36).substring(2, 10) +
      Date.now().toString(36).substring(-4);

    console.log("Nouvelle session mobile créée:", sessionId);

    // Nettoyer les anciennes sessions
    this.cleanExpiredSessions();

    // Créer une nouvelle session
    this.mobileSessions.set(sessionId, {
      audioBlob: null,
      timestamp: Date.now(),
    });

    // Sauvegarder dans localStorage
    this.saveSessionsToStorage();

    return sessionId;
  }

  /**
   * Stocke l'audio enregistré depuis le mobile
   * @param sessionId ID de la session
   * @param audioBlob Blob audio à stocker
   * @returns boolean indiquant si le stockage a réussi
   */
  storeMobileAudio(sessionId: string, audioBlob: Blob): boolean {
    console.log(
      `Tentative de stockage d'audio pour la session ${sessionId}`,
      `Taille: ${Math.round(audioBlob.size / 1024)} KB`
    );

    const session = this.mobileSessions.get(sessionId);

    if (!session) {
      console.warn(`Session ${sessionId} non trouvée pour le stockage audio`);
      return false;
    }

    if (this.isSessionExpired(session.timestamp)) {
      console.warn(`Session ${sessionId} expirée, nettoyage`);
      this.mobileSessions.delete(sessionId);
      return false;
    }

    // Stocker l'audio et mettre à jour le timestamp
    session.audioBlob = audioBlob;
    session.timestamp = Date.now();
    console.log(`Audio stocké avec succès pour la session ${sessionId}`);

    return true;
  }

  /**
   * Récupère l'audio enregistré depuis le mobile
   * @param sessionId ID de la session
   * @returns Blob audio ou null si non trouvé
   */
  getMobileAudio(sessionId: string): Blob | null {
    console.log(
      `Tentative de récupération d'audio pour la session ${sessionId}`
    );

    const session = this.mobileSessions.get(sessionId);

    if (!session) {
      console.warn(
        `Session ${sessionId} non trouvée pour la récupération audio`
      );
      return null;
    }

    if (!session.audioBlob) {
      console.warn(`Aucun audio trouvé pour la session ${sessionId}`);
      return null;
    }

    console.log(`Audio récupéré avec succès pour la session ${sessionId}`);
    const audioBlob = session.audioBlob;

    // On conserve la session pour permettre plusieurs récupérations si nécessaire
    // mais on réinitialise le timestamp pour qu'elle expire plus tard
    session.timestamp = Date.now();

    return audioBlob;
  }

  /**
   * Vérifie si une session mobile existe et est valide
   * @param sessionId ID de la session
   * @returns boolean
   */
  isValidMobileSession(sessionId: string): boolean {
    console.log(`Vérification de la session ${sessionId}`);
    console.log(
      `Statut actuel de la Map: ${this.mobileSessions.size} sessions`
    );

    // Si la session existe déjà, vérifier sa validité
    const session = this.mobileSessions.get(sessionId);

    if (session) {
      console.log(
        `Session ${sessionId} trouvée, timestamp: ${new Date(
          session.timestamp
        ).toISOString()}`
      );

      if (this.isSessionExpired(session.timestamp)) {
        console.warn(`Session ${sessionId} expirée, nettoyage`);
        this.mobileSessions.delete(sessionId);
        this.saveSessionsToStorage();
        return false;
      }

      console.log(`Session ${sessionId} valide`);
      return true;
    }

    // Si on est en production et que la session n'existe pas,
    // mais qu'elle a un format valide, on la considère comme valide
    // et on la crée dynamiquement
    if (sessionId.length >= 8) {
      console.log(
        `Session ${sessionId} non trouvée dans la Map mais le format semble valide`
      );
      console.log(`Création dynamique de la session ${sessionId}`);

      // Créer la session manuellement
      this.mobileSessions.set(sessionId, {
        audioBlob: null,
        timestamp: Date.now(),
      });

      this.saveSessionsToStorage();
      return true;
    }

    console.warn(`Session ${sessionId} n'existe pas et format invalide`);
    return false;
  }

  /**
   * Vérifie si une session est expirée
   * @param timestamp Timestamp de la session
   * @returns boolean
   */
  private isSessionExpired(timestamp: number): boolean {
    // La session expire après 24 heures au lieu de 10 minutes
    const SESSION_EXPIRY = 24 * 60 * 60 * 1000;
    return Date.now() - timestamp > SESSION_EXPIRY;
  }

  /**
   * Nettoie les sessions expirées
   */
  private cleanExpiredSessions(): void {
    let expiredCount = 0;

    this.mobileSessions.forEach((session, id) => {
      if (this.isSessionExpired(session.timestamp)) {
        this.mobileSessions.delete(id);
        expiredCount++;
      }
    });

    if (expiredCount > 0) {
      console.log(`Nettoyage de ${expiredCount} sessions mobiles expirées`);
    }
  }

  /**
   * Sauvegarde les sessions dans localStorage
   */
  private saveSessionsToStorage(): void {
    try {
      // Convertir Map en format sérialisable
      const sessionsArray = Array.from(this.mobileSessions.entries()).map(
        ([id, session]) => {
          return {
            id,
            // On ne sauvegarde pas le Blob audio, uniquement l'horodatage
            timestamp: session.timestamp,
            hasAudio: !!session.audioBlob,
          };
        }
      );

      if (typeof localStorage !== "undefined") {
        localStorage.setItem("mobile_sessions", JSON.stringify(sessionsArray));
        console.log(
          "Sessions sauvegardées dans localStorage:",
          sessionsArray.length
        );
      } else {
        console.warn(
          "localStorage n'est pas disponible dans cet environnement"
        );
      }
    } catch (error) {
      console.warn("Erreur lors de la sauvegarde des sessions:", error);
    }
  }

  /**
   * Charge les sessions depuis localStorage
   */
  private loadSessionsFromStorage(): void {
    try {
      if (typeof localStorage === "undefined") {
        console.warn(
          "localStorage n'est pas disponible dans cet environnement"
        );
        return;
      }

      const storedSessions = localStorage.getItem("mobile_sessions");
      console.log("Tentative de chargement des sessions depuis localStorage");

      if (!storedSessions) {
        console.log("Aucune session trouvée dans localStorage");
        return;
      }

      const sessionsArray = JSON.parse(storedSessions);
      console.log("Sessions trouvées dans localStorage:", sessionsArray.length);

      // Restaurer les sessions
      let validSessionCount = 0;
      sessionsArray.forEach(
        (session: { id: string; timestamp: number; hasAudio?: boolean }) => {
          if (!this.isSessionExpired(session.timestamp)) {
            this.mobileSessions.set(session.id, {
              audioBlob: null, // Le blob n'est pas sauvegardé
              timestamp: session.timestamp,
            });
            validSessionCount++;
            console.log(
              `Session restaurée: ${session.id}, timestamp: ${new Date(
                session.timestamp
              ).toISOString()}`
            );
          } else {
            console.log(`Session expirée ignorée: ${session.id}`);
          }
        }
      );

      console.log(
        `${validSessionCount}/${sessionsArray.length} sessions valides restaurées depuis localStorage`
      );
    } catch (error) {
      console.warn("Erreur lors du chargement des sessions:", error);
    }
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
      console.log("Démarrage de l'enregistrement...");
      setIsRecording(true);
      audioChunksRef.current = [];

      const mediaRecorder = await aiService.startSpeechRecognition();
      mediaRecorderRef.current = mediaRecorder;

      // Stocker le stream pour pouvoir le nettoyer plus tard
      if (mediaRecorder.stream) {
        streamRef.current = mediaRecorder.stream;
        console.log("Stream audio stocké");
      }

      // Configurer les écouteurs d'événements
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log("Données audio reçues:", event.data.size, "bytes");
          audioChunksRef.current.push(event.data);
        }
      };

      // Gérer les erreurs du MediaRecorder
      mediaRecorder.onerror = (event) => {
        console.error("Erreur du MediaRecorder:", event);
        setError("Une erreur est survenue pendant l'enregistrement");
        setIsRecording(false);
      };

      // Démarrer l'enregistrement
      mediaRecorder.start(1000); // Collecter les données toutes les secondes
      console.log("Enregistrement démarré avec succès");
    } catch (err: unknown) {
      console.error(
        "Erreur détaillée lors du démarrage de l'enregistrement:",
        err
      );
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de démarrer l'enregistrement"
      );
      setIsRecording(false);

      // Nettoyer les ressources en cas d'erreur
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current = null;
      }
    }
  };

  // Arrêter l'enregistrement et transcrire
  const stopRecording = async (
    modelId: string = "whisper"
  ): Promise<Blob | null> => {
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
      return audioBlob;
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la transcription"
      );
      setIsProcessing(false);
      console.error(err);
      return null;
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
