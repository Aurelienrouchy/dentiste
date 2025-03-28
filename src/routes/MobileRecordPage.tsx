import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Mic,
  StopCircle,
  AlertCircle,
  CheckCircle,
  Headphones,
} from "lucide-react";
import { audioTransferService } from "@/lib/services/audioTransfer.service";
import { useSearch } from "@tanstack/react-router";
import { Route as mobileRecordRoute } from "./mobile-record";

export function MobileRecordPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isTransferred, setIsTransferred] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // MediaRecorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Utiliser les hooks de TanStack Router
  const search = useSearch({ from: mobileRecordRoute.id });
  const sessionId = search.sessionId as string | undefined;
  const sessionIdValue = sessionId || null;

  // Vérifier la validité de la session
  useEffect(() => {
    if (!sessionIdValue) {
      setError("Session invalide: identifiant manquant");
      return;
    }
  }, [sessionIdValue]);

  // Nettoyer les ressources lors du démontage
  useEffect(() => {
    return () => {
      cleanupAudioResources();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Formater le temps d'enregistrement (MM:SS)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Nettoyer les ressources audio
  const cleanupAudioResources = () => {
    if (streamRef.current) {
      console.log("Arrêt des pistes audio et libération du microphone");
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log(`Piste ${track.kind} arrêtée`);
      });
      streamRef.current = null;
    } else {
      console.log("Aucun stream audio à nettoyer");
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop();
        console.log("MediaRecorder arrêté");
      } catch (e) {
        console.warn("Erreur lors de l'arrêt du MediaRecorder:", e);
      }
    }

    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  };

  // Initialiser un accès au microphone (pour Safari iOS)
  const initializeAudio = async (): Promise<boolean> => {
    try {
      setError(null);

      // Demander l'accès au microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Sur iOS Safari, nous gardons le stream actif pour maintenir l'accès
      streamRef.current = stream;

      // Tester si MediaRecorder est disponible
      if (typeof MediaRecorder === "undefined") {
        throw new Error("MediaRecorder n'est pas supporté par ce navigateur");
      }

      // Vérifier les types MIME supportés (important pour iOS)
      const mimeTypes = [
        "audio/webm",
        "audio/mp4",
        "audio/ogg",
        "audio/wav",
        "", // Type par défaut
      ];

      let supportedType = "";
      for (const type of mimeTypes) {
        if (type && MediaRecorder.isTypeSupported(type)) {
          supportedType = type;
          break;
        }
      }

      // Créer un MediaRecorder test pour vérifier que tout fonctionne
      const testRecorder = new MediaRecorder(stream, {
        mimeType: supportedType,
      });

      // Vérifier que le recorder est créé correctement
      if (testRecorder.state !== "inactive") {
        throw new Error("Impossible d'initialiser le MediaRecorder");
      }

      setIsReady(true);
      return true;
    } catch (err) {
      cleanupAudioResources();

      if (err instanceof Error) {
        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError"
        ) {
          setError(
            "L'accès au microphone a été refusé. Veuillez l'autoriser dans les paramètres de votre navigateur."
          );
        } else {
          setError(`Erreur d'accès au microphone: ${err.message}`);
        }
      } else {
        setError("Erreur lors de l'initialisation de l'enregistrement audio");
      }

      console.error("Erreur d'initialisation audio:", err);
      return false;
    }
  };

  // Démarrer l'enregistrement
  const startRecording = async (): Promise<boolean> => {
    try {
      // Si le stream n'existe pas déjà, l'initialiser
      if (!streamRef.current) {
        const success = await initializeAudio();
        if (!success) return false;
      }

      // Nettoyer les chunks précédents
      audioChunksRef.current = [];

      // Créer le MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
      mediaRecorderRef.current = new MediaRecorder(streamRef.current!, {
        mimeType,
      });

      // Configurer l'événement de données disponibles
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Déclencher l'événement ondataavailable toutes les 1 seconde (plus fiable sur iOS)
      mediaRecorderRef.current.start(1000);

      // Démarrer le timer
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      return true;
    } catch (err) {
      cleanupAudioResources();

      if (err instanceof Error) {
        setError(
          `Erreur lors du démarrage de l'enregistrement: ${err.message}`
        );
      } else {
        setError("Erreur lors du démarrage de l'enregistrement");
      }

      console.error("Erreur de démarrage d'enregistrement:", err);
      return false;
    }
  };

  // Arrêter l'enregistrement et obtenir le blob audio
  const stopRecording = async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (
        !mediaRecorderRef.current ||
        mediaRecorderRef.current.state === "inactive"
      ) {
        cleanupAudioResources();
        resolve(null);
        return;
      }

      // Arrêter le timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Assurer que nous avons des données audio avant d'arrêter
      if (audioChunksRef.current.length === 0) {
        console.warn("Aucun chunk audio n'a été enregistré");
        // Forcer une dernière capture de données avant d'arrêter
        if (mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.requestData();
        }
      }

      // Gérer l'événement d'arrêt
      mediaRecorderRef.current.onstop = () => {
        try {
          // Créer le blob audio à partir des chunks
          if (audioChunksRef.current.length > 0) {
            const audioType =
              mediaRecorderRef.current?.mimeType || "audio/webm";
            const audioBlob = new Blob(audioChunksRef.current, {
              type: audioType,
            });

            console.log(
              `Audio blob créé: ${Math.round(audioBlob.size / 1024)} KB`
            );

            // Nettoyer les ressources MediaRecorder
            mediaRecorderRef.current = null;

            // On vide les chunks après avoir créé le blob
            audioChunksRef.current = [];

            // Si le blob est trop petit (moins de 1KB), il y a probablement eu un problème
            if (audioBlob.size < 1024) {
              console.warn(
                "Blob audio trop petit, possible problème d'enregistrement"
              );
            }

            resolve(audioBlob);
          } else {
            console.warn("Aucune donnée audio n'a été collectée");
            cleanupAudioResources();
            resolve(null);
          }
        } catch (e) {
          console.error("Erreur lors de la création du blob audio:", e);
          cleanupAudioResources();
          resolve(null);
        }
      };

      // Gérer les erreurs
      mediaRecorderRef.current.onerror = (event) => {
        console.error("Erreur MediaRecorder:", event);
        cleanupAudioResources();
        resolve(null);
      };

      // Arrêter l'enregistrement
      try {
        // Capturer les données avant d'arrêter pour éviter les enregistrements vides
        if (mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.requestData();

          // Utiliser setTimeout pour s'assurer que les données sont bien capturées avant l'arrêt
          setTimeout(() => {
            try {
              if (
                mediaRecorderRef.current &&
                mediaRecorderRef.current.state === "recording"
              ) {
                mediaRecorderRef.current.stop();
              } else {
                console.warn(
                  "MediaRecorder n'est plus en état d'enregistrement"
                );
                resolve(null);
              }
            } catch (err) {
              console.error(
                "Erreur lors de l'arrêt du MediaRecorder (retardé):",
                err
              );
              cleanupAudioResources();
              resolve(null);
            }
          }, 300);
        } else {
          console.warn("MediaRecorder n'est pas en état d'enregistrement");
          cleanupAudioResources();
          resolve(null);
        }
      } catch (err) {
        console.error("Erreur lors de l'arrêt du MediaRecorder:", err);
        cleanupAudioResources();
        resolve(null);
      }
    });
  };

  // Télécharger le fichier audio sur Firebase Storage
  const uploadAudioToFirebase = async (audioBlob: Blob): Promise<boolean> => {
    if (!sessionIdValue) return false;

    try {
      setUploadProgress(10);

      // Simuler une progression de téléchargement pour la UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = prev + Math.floor(Math.random() * 15);
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 300);

      // Télécharger l'audio sur Firebase Storage
      await audioTransferService.uploadRecording(sessionIdValue, audioBlob);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Libérer les ressources audio après un téléchargement réussi
      cleanupAudioResources();

      return true;
    } catch (error) {
      console.error("Erreur lors du téléchargement sur Firebase:", error);
      setUploadProgress(0);
      return false;
    }
  };

  // Gestionnaire principal pour démarrer/arrêter l'enregistrement
  const handleRecord = async () => {
    try {
      // Réinitialiser les messages
      setError(null);
      setSuccessMessage(null);
      setIsTransferred(false);

      if (isRecording) {
        // Arrêter l'enregistrement
        setIsProcessing(true);
        setIsRecording(false); // Désactiver immédiatement pour éviter les double-clics

        // Mettre une alerte visuelle d'arrêt en cours
        setSuccessMessage("Arrêt de l'enregistrement en cours...");

        const audioBlob = await stopRecording();

        if (audioBlob && sessionIdValue) {
          setSuccessMessage("Transfert de l'audio en cours...");

          // Télécharger l'audio sur Firebase
          const success = await uploadAudioToFirebase(audioBlob);

          if (success) {
            setSuccessMessage("Enregistrement réussi et transféré");
            setIsTransferred(true);

            // Assurer que toutes les ressources audio sont libérées
            cleanupAudioResources();

            // Vibrer pour indiquer la réussite
            if (navigator.vibrate) {
              navigator.vibrate([100, 50, 100]);
            }
          } else {
            setError("Erreur lors du transfert. Veuillez réessayer.");
          }
        } else {
          setError(
            "Aucun audio n'a été enregistré ou enregistrement incomplet"
          );
        }

        setIsProcessing(false);
      } else {
        // Démarrer l'enregistrement
        const success = await startRecording();
        if (success) {
          setIsRecording(true);
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur lors de l'enregistrement";

      setError(errorMessage);
      console.error("Erreur d'enregistrement:", err);
      setIsRecording(false);
      setIsProcessing(false);
    }
  };

  // Gérer le bouton d'initialisation
  const handleInitializeAudio = async () => {
    try {
      setError(null);
      const success = await initializeAudio();
      if (success) {
        setSuccessMessage("Microphone activé avec succès");
        // Masquer le message après 2 secondes
        setTimeout(() => setSuccessMessage(null), 2000);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Erreur lors de l'initialisation du microphone";

      setError(errorMessage);
      console.error("Erreur d'initialisation:", err);
    }
  };

  // Ajouter un effet pour libérer les ressources lorsque isTransferred devient true
  useEffect(() => {
    if (isTransferred) {
      console.log("Transfert réussi, libération des ressources audio");
      cleanupAudioResources();
    }
  }, [isTransferred]);

  // Affichage en cas de session invalide
  if (!sessionIdValue) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">Session invalide</p>
      </div>
    );
  }

  // Affichage après transfert réussi
  if (isTransferred) {
    // S'assurer que toutes les ressources audio sont libérées
    cleanupAudioResources();

    return (
      <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-md space-y-4 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold">Transfert réussi!</h1>
          <p className="text-muted-foreground">
            L'audio a été envoyé à l'ordinateur avec succès. Vous pouvez
            maintenant fermer cette page.
          </p>
          <Button className="mt-4" onClick={() => window.close()}>
            Fermer cette page
          </Button>
        </div>
      </div>
    );
  }

  // Affichage principal
  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Enregistrement vocal</h1>
          <p className="text-muted-foreground">
            {isRecording
              ? "Enregistrement en cours..."
              : "Appuyez sur le bouton pour commencer l'enregistrement"}
          </p>
          {!isRecording && !isProcessing && (
            <p className="text-xs mt-2 text-muted-foreground">
              Après l'enregistrement, l'audio sera automatiquement transféré à
              l'ordinateur
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {successMessage && !isTransferred && (
          <div className="bg-green-50 text-green-600 p-4 rounded-md">
            {successMessage}

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-right mt-1">{uploadProgress}%</p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col items-center space-y-4">
          {isRecording && (
            <div className="text-2xl font-mono">
              {formatTime(recordingTime)}
            </div>
          )}

          {!isReady && !isRecording ? (
            <Button
              size="lg"
              onClick={handleInitializeAudio}
              disabled={isProcessing}
              className="w-24 h-24 rounded-full"
            >
              <Headphones className="h-8 w-8" />
            </Button>
          ) : (
            <Button
              size="lg"
              variant={isRecording ? "destructive" : "default"}
              onClick={handleRecord}
              disabled={isProcessing}
              className="w-24 h-24 rounded-full"
            >
              {isRecording ? (
                <StopCircle className="h-8 w-8" />
              ) : (
                <Mic className="h-8 w-8" />
              )}
            </Button>
          )}

          {!isReady && !isRecording && (
            <p className="text-sm text-muted-foreground">
              Appuyez d'abord pour activer le microphone
            </p>
          )}

          {isProcessing && (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>Traitement en cours...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
