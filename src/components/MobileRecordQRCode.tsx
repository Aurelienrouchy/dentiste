import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { RefreshCw, Loader2, FileAudio } from "lucide-react";
import { audioTransferService } from "@/lib/services/audioTransfer.service";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/hooks/useAuth";

interface MobileRecordQRCodeProps {
  onAudioReceived: (audioBlob: Blob) => void;
}

interface RecordingFile {
  name: string;
  url: string;
}

export function MobileRecordQRCode({
  onAudioReceived,
}: MobileRecordQRCodeProps) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingCount, setPollingCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [manualSessionId, setManualSessionId] = useState<string>("");
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [recordings, setRecordings] = useState<RecordingFile[]>([]);
  const [showRecordings, setShowRecordings] = useState(false);
  const [isLoadingRecordings, setIsLoadingRecordings] = useState(false);
  const { user } = useAuth();
  const userId = user?.uid;

  const generateSession = () => {
    const newSessionId = audioTransferService.createSession(userId);
    setCurrentSessionId(newSessionId);
    setQrUrl(
      `${window.location.origin}/mobile-record?sessionId=${newSessionId}${userId ? `&userId=${userId}` : ""}`
    );
    setPollingCount(0);
    setStatusMessage("En attente d'un enregistrement...");
    console.log(`Nouvelle session créée: ${newSessionId}`);
  };

  const checkSpecificSession = async () => {
    if (!manualSessionId) {
      setStatusMessage("Veuillez saisir un ID de session");
      return;
    }

    setStatusMessage("Vérification de l'ID de session...");

    try {
      // Vérifier si l'enregistrement est disponible
      const isReady = await audioTransferService.isRecordingReady(
        manualSessionId,
        userId
      );

      if (isReady) {
        setStatusMessage(
          `Fichier audio trouvé pour la session ${manualSessionId}!`
        );
        try {
          // Télécharger l'enregistrement
          const audioBlob =
            await audioTransferService.downloadRecording(manualSessionId);
          if (audioBlob) {
            onAudioReceived(audioBlob);
            setStatusMessage(
              "Téléchargement réussi. Génération d'une nouvelle session..."
            );
            generateSession();
          } else {
            setStatusMessage("Erreur: Impossible de télécharger l'audio");
          }
        } catch (downloadError: unknown) {
          const errorMessage =
            downloadError instanceof Error
              ? downloadError.message
              : String(downloadError);
          setStatusMessage(`Erreur lors du téléchargement: ${errorMessage}`);
        }
      } else {
        setStatusMessage(
          `Aucun fichier audio trouvé pour la session ${manualSessionId}`
        );
      }
    } catch (error: unknown) {
      console.error("Erreur lors de la vérification:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setStatusMessage(`Erreur: ${errorMessage}`);
    }
  };

  useEffect(() => {
    generateSession();
  }, [userId]);

  // Polling pour vérifier si l'audio est disponible
  useEffect(() => {
    if (!currentSessionId) return;

    setIsPolling(true);

    const checkAudio = async () => {
      setPollingCount((prev) => prev + 1);
      console.log(
        `Polling #${pollingCount} pour la session ${currentSessionId}`
      );

      try {
        // Pour les 10 premières tentatives, afficher l'ID de session en entier
        if (pollingCount <= 10) {
          console.log(`Session actuelle: "${currentSessionId}"`);
        }

        // Vérifier si l'enregistrement est prêt
        const isReady = await audioTransferService.isRecordingReady(
          currentSessionId,
          userId
        );

        if (isReady) {
          setStatusMessage("Enregistrement trouvé, téléchargement en cours...");
          const audioBlob =
            await audioTransferService.downloadRecording(currentSessionId);

          if (audioBlob) {
            console.log("Audio téléchargé avec succès");
            onAudioReceived(audioBlob);
            setIsPolling(false);
            generateSession();
            return;
          }
        }

        // Afficher un message d'état adapté
        if (pollingCount > 0 && pollingCount % 10 === 0) {
          setStatusMessage(
            `Toujours en attente d'enregistrement... (${pollingCount / 10}s)`
          );
        }

        // Arrêter le polling après 300 essais (10 minutes)
        if (pollingCount > 300) {
          console.log("Polling arrêté après 300 tentatives");
          setStatusMessage("Aucun enregistrement détecté après 10 minutes");
          setIsPolling(false);
          return;
        }
      } catch (error) {
        console.error("Erreur lors du polling audio:", error);
        setStatusMessage(
          `Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}`
        );
      }
    };

    const interval = setInterval(
      checkAudio,
      // Vérifier plus fréquemment pendant les 10 premières secondes
      pollingCount < 10 ? 1000 : 2000
    );

    return () => {
      clearInterval(interval);
      setIsPolling(false);
    };
  }, [currentSessionId, onAudioReceived, pollingCount, userId]);

  // Fonction pour charger tous les enregistrements
  const loadAllRecordings = async () => {
    setIsLoadingRecordings(true);
    try {
      const files = await audioTransferService.listAllRecordings(userId);
      setRecordings(files);
      setShowRecordings(true);
    } catch (error) {
      console.error("Erreur lors du chargement des enregistrements:", error);
      setStatusMessage("Erreur lors du chargement des enregistrements");
    } finally {
      setIsLoadingRecordings(false);
    }
  };

  // Fonction pour utiliser un enregistrement existant
  const handleUseRecording = async (url: string) => {
    try {
      setStatusMessage("Téléchargement de l'enregistrement...");
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        onAudioReceived(blob);
        setStatusMessage("Enregistrement chargé avec succès");
      } else {
        setStatusMessage(`Erreur lors du téléchargement: ${response.status}`);
      }
    } catch (error) {
      console.error("Erreur lors du téléchargement:", error);
      setStatusMessage("Erreur lors du téléchargement");
    }
  };

  if (!qrUrl) {
    return null;
  }

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      <div className="bg-white p-4 rounded-lg shadow-lg">
        <QRCodeSVG value={qrUrl} size={200} />
        <p className="text-sm text-muted-foreground mt-2 text-center">
          Scannez ce QR code avec votre téléphone pour enregistrer l'audio
        </p>
        <p className="text-xs text-muted-foreground mt-1 text-center break-all">
          URL: {qrUrl}
        </p>

        {isPolling && (
          <div className="flex flex-col items-center justify-center mt-2 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              <span>En attente de l'audio...</span>
            </div>
            {statusMessage && (
              <span className="text-xs mt-1">{statusMessage}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col space-y-2 w-full">
        <Button
          variant="outline"
          size="sm"
          onClick={generateSession}
          className="w-full"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Générer un nouveau QR code
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowManualInput(!showManualInput)}
          className="w-full"
        >
          {showManualInput ? "Masquer" : "Vérification manuelle"}
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={loadAllRecordings}
          className="w-full"
          disabled={isLoadingRecordings}
        >
          {isLoadingRecordings ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileAudio className="h-4 w-4 mr-2" />
          )}
          {showRecordings
            ? "Actualiser la liste"
            : "Afficher tous les enregistrements"}
        </Button>
      </div>

      {showManualInput && (
        <div className="flex flex-col space-y-2 w-full p-3 border rounded-md">
          <p className="text-xs text-muted-foreground">
            Saisissez l'ID de session exacte à vérifier:
          </p>
          <div className="flex space-x-2">
            <input
              type="text"
              value={manualSessionId}
              onChange={(e) => setManualSessionId(e.target.value)}
              className="flex-1 px-2 py-1 text-sm border rounded"
              placeholder="ID de session (ex: vkdnvdvzm8syja7w)"
            />
            <Button
              size="sm"
              onClick={checkSpecificSession}
              disabled={!manualSessionId}
            >
              Vérifier
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Cette fonction permet de vérifier directement l'existence d'un
            fichier audio associé à une session.
          </p>
        </div>
      )}

      {showRecordings && recordings.length > 0 && (
        <div className="w-full p-3 border rounded-md">
          <h3 className="text-sm font-medium mb-2">
            Enregistrements disponibles ({recordings.length})
          </h3>
          <div className="max-h-60 overflow-y-auto">
            <ul className="space-y-2">
              {recordings.map((recording, index) => (
                <li key={index} className="text-xs border-b pb-2">
                  <div className="flex justify-between items-center">
                    <span className="truncate w-2/3">{recording.name}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUseRecording(recording.url)}
                      className="text-xs h-7"
                    >
                      Utiliser
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {showRecordings && recordings.length === 0 && (
        <div className="w-full p-3 border rounded-md text-center">
          <p className="text-sm text-muted-foreground">
            Aucun enregistrement disponible
          </p>
        </div>
      )}
    </div>
  );
}
