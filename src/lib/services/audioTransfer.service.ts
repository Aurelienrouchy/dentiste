import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from "firebase/storage";
import { storage } from "../firebase/config";

export interface AudioSession {
  id: string;
  timestamp: number;
  url?: string;
  status: "pending" | "completed" | "error";
}

class AudioTransferService {
  private sessions: Map<string, AudioSession> = new Map();
  private readonly STORAGE_PATH = "recordings";
  private readonly SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 heures
  private sessionCheckInterval: number | null = null;

  constructor() {
    console.log("AudioTransferService initialized");
    this.loadSessionsFromLocalStorage();
    this.startSessionCheckInterval();
  }

  /**
   * Démarre l'intervalle de vérification des sessions
   */
  private startSessionCheckInterval(): void {
    // Vérifier et nettoyer les sessions expirées toutes les minutes
    this.sessionCheckInterval = window.setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000);
  }

  /**
   * Crée une nouvelle session pour le transfert audio
   * @returns ID de session
   */
  public createSession(): string {
    const sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;

    this.sessions.set(sessionId, {
      id: sessionId,
      timestamp: Date.now(),
      status: "pending",
    });

    this.saveSessionsToLocalStorage();
    console.log(`Nouvelle session audio créée: ${sessionId}`);

    return sessionId;
  }

  /**
   * Télécharge un enregistrement audio sur Firebase Storage
   * @param sessionId ID de la session
   * @param audioBlob Blob audio
   * @returns Promise avec l'URL de téléchargement
   */
  public async uploadRecording(
    sessionId: string,
    audioBlob: Blob
  ): Promise<string> {
    try {
      let session = this.sessions.get(sessionId);

      // Si la session n'existe pas dans cette instance, la créer
      if (!session) {
        console.log(
          `Session ${sessionId} non trouvée localement, création automatique`
        );
        session = {
          id: sessionId,
          timestamp: Date.now(),
          status: "pending",
        };
        this.sessions.set(sessionId, session);
        this.saveSessionsToLocalStorage();
      }

      // Déterminer l'extension de fichier en fonction du type MIME
      const fileExtension = this.getFileExtensionFromBlob(audioBlob);
      const filename = `${this.STORAGE_PATH}/${sessionId}.${fileExtension}`;
      const storageRef = ref(storage, filename);

      console.log(
        `Téléchargement de l'audio pour la session ${sessionId} vers Firebase Storage`
      );
      await uploadBytes(storageRef, audioBlob);

      const downloadURL = await getDownloadURL(storageRef);

      // Mettre à jour la session avec l'URL
      session.url = downloadURL;
      session.status = "completed";
      session.timestamp = Date.now(); // Réinitialiser le timestamp pour prolonger la validité

      this.saveSessionsToLocalStorage();

      console.log(`Audio téléchargé avec succès: ${downloadURL}`);
      return downloadURL;
    } catch (error) {
      console.error("Erreur lors du téléchargement de l'audio:", error);

      const session = this.sessions.get(sessionId);
      if (session) {
        session.status = "error";
        this.saveSessionsToLocalStorage();
      }

      throw error;
    }
  }

  /**
   * Récupère l'URL de téléchargement d'un enregistrement audio
   * @param sessionId ID de la session
   * @returns URL ou null si non disponible
   */
  public getRecordingUrl(sessionId: string): string | null {
    const session = this.sessions.get(sessionId);

    if (!session) {
      console.warn(`Session non trouvée: ${sessionId}`);
      return null;
    }

    return session.url || null;
  }

  /**
   * Vérifie si un enregistrement est disponible pour une session
   * @param sessionId ID de la session
   * @returns true si l'enregistrement est disponible
   */
  public async isRecordingReady(sessionId: string): Promise<boolean> {
    try {
      // Vérifier d'abord en mémoire
      const session = this.sessions.get(sessionId);
      if (session && session.status === "completed" && !!session.url) {
        return true;
      }

      // Si pas en mémoire, essayer de vérifier directement sur Firebase Storage
      try {
        // Essayer avec différentes extensions possibles
        const extensions = ["webm", "mp3", "mp4", "wav", "ogg"];

        for (const ext of extensions) {
          const filename = `${this.STORAGE_PATH}/${sessionId}.${ext}`;
          const storageRef = ref(storage, filename);

          try {
            // Si on peut obtenir l'URL, le fichier existe
            const url = await getDownloadURL(storageRef);

            // Créer ou mettre à jour la session locale
            if (!session) {
              this.sessions.set(sessionId, {
                id: sessionId,
                timestamp: Date.now(),
                status: "completed",
                url,
              });
            } else {
              session.status = "completed";
              session.url = url;
              session.timestamp = Date.now();
            }

            this.saveSessionsToLocalStorage();
            return true;
          } catch (e) {
            // Fichier non trouvé avec cette extension, continuer avec la suivante
            continue;
          }
        }
      } catch (error) {
        console.log(
          `Erreur lors de la vérification dans Firebase Storage: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      return false;
    } catch (error) {
      console.error("Erreur dans isRecordingReady:", error);
      return false;
    }
  }

  /**
   * Télécharge un enregistrement audio à partir de l'URL
   * @param sessionId ID de la session
   * @returns Promise avec le Blob audio ou null
   */
  public async downloadRecording(sessionId: string): Promise<Blob | null> {
    try {
      const session = this.sessions.get(sessionId);

      if (!session || !session.url) {
        console.warn(`Aucune URL disponible pour la session ${sessionId}`);
        return null;
      }

      const response = await fetch(session.url);

      if (!response.ok) {
        throw new Error(
          `Erreur lors du téléchargement: ${response.statusText}`
        );
      }

      const blob = await response.blob();
      console.log(`Audio téléchargé avec succès pour la session ${sessionId}`);

      return blob;
    } catch (error) {
      console.error("Erreur lors du téléchargement de l'audio:", error);
      return null;
    }
  }

  /**
   * Supprime un enregistrement
   * @param sessionId ID de la session
   */
  public async deleteRecording(sessionId: string): Promise<void> {
    try {
      const session = this.sessions.get(sessionId);

      if (!session) {
        return;
      }

      // Si l'URL existe, supprimer le fichier de Firebase Storage
      if (session.url) {
        const fileExtension = this.getFileExtensionFromUrl(session.url);
        const filename = `${this.STORAGE_PATH}/${sessionId}.${fileExtension}`;
        const storageRef = ref(storage, filename);

        try {
          await deleteObject(storageRef);
          console.log(`Fichier supprimé de Firebase Storage: ${filename}`);
        } catch (error) {
          console.warn(`Erreur lors de la suppression du fichier:`, error);
        }
      }

      // Supprimer la session
      this.sessions.delete(sessionId);
      this.saveSessionsToLocalStorage();
    } catch (error) {
      console.error(
        "Erreur lors de la suppression de l'enregistrement:",
        error
      );
    }
  }

  /**
   * Nettoie les sessions expirées
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    let expiredCount = 0;

    this.sessions.forEach((session, id) => {
      if (now - session.timestamp > this.SESSION_EXPIRY_MS) {
        this.deleteRecording(id);
        expiredCount++;
      }
    });

    if (expiredCount > 0) {
      console.log(`${expiredCount} sessions expirées supprimées`);
      this.saveSessionsToLocalStorage();
    }
  }

  /**
   * Sauvegarde les sessions dans le localStorage
   */
  private saveSessionsToLocalStorage(): void {
    try {
      const sessionsArray = Array.from(this.sessions.values());
      localStorage.setItem("audio_sessions", JSON.stringify(sessionsArray));
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des sessions:", error);
    }
  }

  /**
   * Charge les sessions depuis le localStorage
   */
  private loadSessionsFromLocalStorage(): void {
    try {
      const storedSessions = localStorage.getItem("audio_sessions");

      if (!storedSessions) {
        return;
      }

      const sessionsArray = JSON.parse(storedSessions) as AudioSession[];

      sessionsArray.forEach((session) => {
        this.sessions.set(session.id, session);
      });

      console.log(
        `${this.sessions.size} sessions chargées depuis localStorage`
      );

      // Nettoyer les sessions expirées au chargement
      this.cleanupExpiredSessions();
    } catch (error) {
      console.error("Erreur lors du chargement des sessions:", error);
    }
  }

  /**
   * Détermine l'extension de fichier en fonction du type MIME
   * @param blob Blob audio
   * @returns Extension de fichier
   */
  private getFileExtensionFromBlob(blob: Blob): string {
    const mimeType = blob.type;

    switch (mimeType) {
      case "audio/webm":
        return "webm";
      case "audio/mp4":
        return "mp4";
      case "audio/mpeg":
        return "mp3";
      case "audio/ogg":
        return "ogg";
      case "audio/wav":
        return "wav";
      default:
        return "webm"; // Extension par défaut
    }
  }

  /**
   * Extrait l'extension de fichier depuis une URL
   * @param url URL du fichier
   * @returns Extension de fichier
   */
  private getFileExtensionFromUrl(url: string): string {
    const match = url.match(/\.([^.]+)(?:\?|$)/);
    return match ? match[1] : "webm";
  }

  /**
   * Libère les ressources lors de la destruction du service
   */
  public dispose(): void {
    if (this.sessionCheckInterval !== null) {
      window.clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }

  /**
   * Vérifie directement l'existence d'un fichier audio dans Firebase Storage
   * @param sessionId ID de la session
   * @returns Promise avec l'URL de téléchargement ou null
   */
  public async checkDirectStorage(sessionId: string): Promise<string | null> {
    try {
      console.log(
        `Vérification directe du fichier pour la session ${sessionId}`
      );

      // Essayer avec différentes extensions possibles
      const extensions = [
        "webm",
        "mp3",
        "mp4",
        "wav",
        "ogg",
        "m4a",
        "aac",
        "opus",
      ];

      for (const ext of extensions) {
        try {
          const fileRef = ref(
            storage,
            `${this.STORAGE_PATH}/${sessionId}.${ext}`
          );
          const url = await getDownloadURL(fileRef);
          console.log(`Fichier trouvé avec l'extension ${ext}: ${url}`);

          // Créer ou mettre à jour la session locale
          const session = this.sessions.get(sessionId) || {
            id: sessionId,
            timestamp: Date.now(),
            status: "pending",
          };

          session.url = url;
          session.status = "completed";
          session.timestamp = Date.now();
          this.sessions.set(sessionId, session);
          this.saveSessionsToLocalStorage();

          return url;
        } catch (error: unknown) {
          // Fichier non trouvé avec cette extension, continuer avec la suivante
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.log(
            `Fichier non trouvé avec l'extension ${ext}: ${errorMessage}`
          );
        }
      }

      // Si on n'a pas trouvé par nom exact, lister tous les fichiers du dossier recordings
      const folderRef = ref(storage, this.STORAGE_PATH);
      const result = await listAll(folderRef);

      console.log(
        `${result.items.length} fichiers trouvés dans le dossier ${this.STORAGE_PATH}`
      );

      // Commencer par les correspondances exactes puis tenter des correspondances partielles
      // 1. Rechercher un fichier qui commence par sessionId
      for (const item of result.items) {
        const fileName = item.name;
        const fileNameWithoutExt = fileName.split(".")[0];

        if (fileNameWithoutExt === sessionId) {
          console.log(`Correspondance exacte trouvée: ${fileName}`);
          const url = await getDownloadURL(item);

          // Mettre à jour la session
          const session = this.sessions.get(sessionId) || {
            id: sessionId,
            timestamp: Date.now(),
            status: "pending",
          };

          session.url = url;
          session.status = "completed";
          session.timestamp = Date.now();
          this.sessions.set(sessionId, session);
          this.saveSessionsToLocalStorage();

          return url;
        }
      }

      // 2. Rechercher des correspondances partielles
      for (const item of result.items) {
        const fileName = item.name;
        const fileNameWithoutExt = fileName.split(".")[0];

        if (
          fileNameWithoutExt.startsWith(sessionId) ||
          sessionId.startsWith(fileNameWithoutExt) ||
          fileNameWithoutExt.includes(sessionId) ||
          sessionId.includes(fileNameWithoutExt)
        ) {
          console.log(`Correspondance partielle trouvée: ${fileName}`);
          const url = await getDownloadURL(item);

          // Afficher plus d'informations pour le débogage
          console.log(`Session ID recherché: "${sessionId}"`);
          console.log(`Nom de fichier trouvé: "${fileNameWithoutExt}"`);
          console.log(`URL obtenue: ${url}`);

          // Mettre à jour la session
          const session = this.sessions.get(sessionId) || {
            id: sessionId,
            timestamp: Date.now(),
            status: "pending",
          };

          session.url = url;
          session.status = "completed";
          session.timestamp = Date.now();
          this.sessions.set(sessionId, session);
          this.saveSessionsToLocalStorage();

          return url;
        }
      }

      console.log(`Aucun fichier trouvé pour la session ${sessionId}`);
      return null;
    } catch (error) {
      console.error(`Erreur lors de la vérification directe: ${error}`);
      return null;
    }
  }
}

// Créer une instance unique du service
export const audioTransferService = new AudioTransferService();
