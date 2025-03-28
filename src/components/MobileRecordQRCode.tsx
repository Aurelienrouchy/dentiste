import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { audioTransferService } from "@/lib/services/audioTransfer.service";

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

  const generateSession = () => {
    const newSessionId = audioTransferService.createSession();
    setCurrentSessionId(newSessionId);
    setQrUrl(
      `${window.location.origin}/mobile-record?sessionId=${newSessionId}`
    );
    setPollingCount(0);
  };

  useEffect(() => {
    generateSession();
  }, []);

  // Polling pour vérifier si l'audio est disponible
  useEffect(() => {
    if (!currentSessionId) return;

    setIsPolling(true);

    const checkAudio = async () => {
      setPollingCount((prev) => prev + 1);

      try {
        // Vérifier si l'enregistrement est prêt (maintenant asynchrone)
        const isReady =
          await audioTransferService.isRecordingReady(currentSessionId);

        if (isReady) {
          // Télécharger l'enregistrement
          const audioBlob =
            await audioTransferService.downloadRecording(currentSessionId);

          if (audioBlob) {
            console.log(
              "Audio téléchargé avec succès, notification au composant parent"
            );
            onAudioReceived(audioBlob);
            setIsPolling(false);
            generateSession(); // Générer une nouvelle session
            return;
          }
        }

        // Arrêter le polling après 180 essais (6 minutes)
        if (pollingCount > 180) {
          console.log("Polling arrêté après 180 tentatives");
          setIsPolling(false);
          return;
        }
      } catch (error) {
        console.error("Erreur lors du polling audio:", error);
      }
    };

    const interval = setInterval(checkAudio, 2000); // Vérifier toutes les 2 secondes

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
          <div className="flex items-center justify-center mt-2 text-sm text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
            <span>En attente de l'audio...</span>
          </div>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={generateSession}
        className="mt-2"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Générer un nouveau QR code
      </Button>
    </div>
  );
}
