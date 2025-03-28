import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { RefreshCw, Loader2 } from "lucide-react";
import { audioTransferService } from "@/lib/services/audioTransfer.service";
import { Button } from "@/components/ui/button";

interface MobileRecordQRCodeProps {
  onAudioReceived: (audioBlob: Blob) => void;
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

  const generateSession = () => {
    const newSessionId = audioTransferService.createSession();
    setCurrentSessionId(newSessionId);
    setQrUrl(
      `${window.location.origin}/mobile-record?sessionId=${newSessionId}`
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
      // Utiliser la méthode directe pour vérifier l'existence du fichier
      const url =
        await audioTransferService.checkDirectStorage(manualSessionId);

      if (url) {
        setStatusMessage(
          `Fichier audio trouvé pour la session ${manualSessionId}!`
        );
        try {
          // Utiliser getRecordingUrl plutôt que getRecording
          const audioUrl =
            await audioTransferService.getRecordingUrl(manualSessionId);
          if (audioUrl) {
            const response = await fetch(audioUrl);
            if (response.ok) {
              const blob = await response.blob();
              onAudioReceived(blob);
              setStatusMessage(
                "Téléchargement réussi. Génération d'une nouvelle session..."
              );
              generateSession();
            } else {
              setStatusMessage(`Erreur HTTP: ${response.status}`);
            }
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
  }, []);

  const checkFirebaseStorage = async (): Promise<boolean> => {
    if (!currentSessionId) return false;

    console.log(
      `Vérification Firebase Storage pour la session: ${currentSessionId}`
    );

    try {
      // Utiliser la méthode directe
      const url =
        await audioTransferService.checkDirectStorage(currentSessionId);

      if (url) {
        console.log("Audio trouvé directement dans Firebase Storage");
        setIsPolling(false);
        return true;
      }

      console.log(
        "Aucun audio trouvé directement, passage à la vérification normale"
      );
      // Continuer avec la logique existante si nécessaire

      return false;
    } catch (error: unknown) {
      console.error("Erreur lors de la vérification Firebase Storage:", error);
      return false;
    }
  };

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
        // Toujours afficher l'ID de session pour faciliter le débogage
        console.log(`Session actuelle: "${currentSessionId}"`);

        // Afficher un message d'état adapté
        if (pollingCount === 1) {
          setStatusMessage("Recherche de l'enregistrement...");
        } else if (pollingCount > 0 && pollingCount % 5 === 0) {
          setStatusMessage(
            `Recherche en cours... (${Math.floor(pollingCount / 5)}s)`
          );
        }

        // Méthode 2 : Essayer d'abord la vérification directe dans Firebase Storage
        // Cette approche est plus fiable car elle ne dépend pas du cache local
        const directSuccess = await checkFirebaseStorage();

        if (directSuccess) {
          setStatusMessage("Fichier trouvé, téléchargement en cours...");

          try {
            // Récupérer l'URL de téléchargement
            const audioUrl = await audioTransferService.getRecordingUrl(
              currentSessionId!
            );
            if (audioUrl) {
              const response = await fetch(audioUrl);
              if (response.ok) {
                const blob = await response.blob();
                console.log("Audio téléchargé avec succès via Firebase direct");
                onAudioReceived(blob);
                setIsPolling(false);
                setStatusMessage("Téléchargement réussi!");
                setTimeout(() => {
                  generateSession();
                }, 1500);
                return;
              } else {
                console.error(
                  "Erreur lors du téléchargement:",
                  response.statusText
                );
                setStatusMessage(
                  `Erreur HTTP: ${response.status} ${response.statusText}`
                );
              }
            }
          } catch (error) {
            console.error("Erreur lors du téléchargement:", error);
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            setStatusMessage(`Erreur de téléchargement: ${errorMessage}`);
          }
        }

        // Méthode 1 : Vérifier via notre service (utilise le cache local)
        const isReady = await audioTransferService.isRecordingReady(
          currentSessionId!
        );

        if (isReady) {
          setStatusMessage("Enregistrement trouvé, téléchargement en cours...");
          const audioBlob = await audioTransferService.downloadRecording(
            currentSessionId!
          );

          if (audioBlob) {
            console.log("Audio téléchargé avec succès via service");
            onAudioReceived(audioBlob);
            setIsPolling(false);
            setStatusMessage("Téléchargement réussi!");
            setTimeout(() => {
              generateSession();
            }, 1500);
            return;
          }
        }

        // Arrêter le polling après 300 essais (10 minutes)
        if (pollingCount > 300) {
          console.log("Polling arrêté après 300 tentatives");
          setStatusMessage(
            "Aucun enregistrement détecté après 10 minutes. Cliquez sur 'Actualiser' pour réessayer."
          );
          setIsPolling(false);
          return;
        }
      } catch (error) {
        console.error("Erreur lors du polling audio:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        setStatusMessage(`Erreur: ${errorMessage}`);
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
  }, [currentSessionId, onAudioReceived, pollingCount]);

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
            fichier audio spécifique dans Firebase Storage.
          </p>
        </div>
      )}
    </div>
  );
}
