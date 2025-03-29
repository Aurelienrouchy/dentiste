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
  userId?: string;
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
   * @param userId ID de l'utilisateur (optionnel)
   * @returns ID de session
   */
  public createSession(userId?: string): string {
    const sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;

    this.sessions.set(sessionId, {
      id: sessionId,
      timestamp: Date.now(),
      status: "pending",
      userId,
    });

    this.saveSessionsToLocalStorage();
    console.log(`Nouvelle session audio créée: ${sessionId}`);

    return sessionId;
  }

  /**
   * Construit le chemin de stockage en fonction de l'utilisateur
   * @param userId ID de l'utilisateur (optionnel)
   * @param sessionId ID de la session
   * @param fileExtension Extension du fichier
   * @returns Chemin complet pour le stockage
   */
  private getStoragePath(
    userId: string | undefined,
    sessionId: string,
    fileExtension: string
  ): string {
    if (userId) {
      return `${this.STORAGE_PATH}/${userId}/${sessionId}.${fileExtension}`;
    }
    return `${this.STORAGE_PATH}/${sessionId}.${fileExtension}`;
  }

  /**
   * Télécharge un enregistrement audio sur Firebase Storage
   * @param sessionId ID de la session
   * @param audioBlob Blob audio
   * @param userId ID de l'utilisateur (optionnel)
   * @returns Promise avec l'URL de téléchargement
   */
  public async uploadRecording(
    sessionId: string,
    audioBlob: Blob,
    userId?: string
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
          userId,
        };
        this.sessions.set(sessionId, session);
        this.saveSessionsToLocalStorage();
      } else if (userId && !session.userId) {
        // Mettre à jour l'ID utilisateur si fourni
        session.userId = userId;
      }

      // Utiliser l'ID utilisateur de la session si disponible
      const userIdToUse = userId || session.userId;

      // Déterminer l'extension de fichier en fonction du type MIME
      const fileExtension = this.getFileExtensionFromBlob(audioBlob);
      const filename = this.getStoragePath(
        userIdToUse,
        sessionId,
        fileExtension
      );
      const storageRef = ref(storage, filename);

      console.log(
        `Téléchargement de l'audio pour la session ${sessionId} vers Firebase Storage: ${filename}`
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
   * @param userId ID de l'utilisateur (optionnel)
   * @returns true si l'enregistrement est disponible
   */
  public async isRecordingReady(
    sessionId: string,
    userId?: string
  ): Promise<boolean> {
    try {
      // Vérifier d'abord en mémoire
      const session = this.sessions.get(sessionId);
      if (session && session.status === "completed" && !!session.url) {
        return true;
      }

      // Utiliser l'ID utilisateur de la session si disponible
      const userIdToUse = userId || session?.userId;

      // Si pas en mémoire, essayer de vérifier directement sur Firebase Storage
      try {
        // Essayer avec différentes extensions possibles
        const extensions = ["webm", "mp3", "mp4", "wav", "ogg"];

        for (const ext of extensions) {
          const filename = this.getStoragePath(userIdToUse, sessionId, ext);
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
                userId: userIdToUse,
              });
            } else {
              session.status = "completed";
              session.url = url;
              session.timestamp = Date.now();
              if (userIdToUse && !session.userId) {
                session.userId = userIdToUse;
              }
            }

            this.saveSessionsToLocalStorage();
            return true;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (error) {
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
        const filename = this.getStoragePath(
          session.userId,
          sessionId,
          fileExtension
        );
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
   * Liste tous les enregistrements audio stockés dans Firebase Storage
   * @param userId ID de l'utilisateur (optionnel)
   * @returns Promise avec un tableau d'objets contenant le nom et l'URL des fichiers
   */
  public async listAllRecordings(
    userId?: string
  ): Promise<{ name: string; url: string }[]> {
    try {
      // Si un userId est fourni, lister uniquement les fichiers de cet utilisateur
      const folderPath = userId
        ? `${this.STORAGE_PATH}/${userId}`
        : this.STORAGE_PATH;

      const folderRef = ref(storage, folderPath);
      const result = await listAll(folderRef);

      console.log(
        `${result.items.length} fichiers trouvés dans le dossier ${folderPath}`
      );

      const files = await Promise.all(
        result.items.map(async (item) => {
          try {
            const url = await getDownloadURL(item);
            return { name: item.name, url };
          } catch (error) {
            console.error(
              `Erreur lors de la récupération de l'URL pour ${item.name}:`,
              error
            );
            return { name: item.name, url: "" };
          }
        })
      );

      return files;
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des enregistrements:",
        error
      );
      return [];
    }
  }
}

// Créer une instance unique du service
export const audioTransferService = new AudioTransferService();
