import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Mic, Loader2, CheckCircle, RefreshCw } from "lucide-react";
import { audioTransferService } from "@/lib/services/audioTransfer.service";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SimplifiedMobileRecordProps {
  onAudioReceived: (audioBlob: Blob) => void;
}

export function SimplifiedMobileRecord({
  onAudioReceived,
}: SimplifiedMobileRecordProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isAudioReceived, setIsAudioReceived] = useState(false);
  const { user } = useAuth();
  const userId = user?.uid;

  // Initialiser la session au chargement du composant
  useEffect(() => {
    if (isOpen && !qrUrl) {
      generateSession();
    }
  }, [isOpen]);

  // Commencer le polling quand on a une session
  useEffect(() => {
    let pollingInterval: NodeJS.Timeout | null = null;

    if (isPolling && currentSessionId) {
      pollingInterval = setInterval(() => {
        checkForRecording(currentSessionId);
      }, 2000);
    }

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [isPolling, currentSessionId]);

  // Fermer la modale après réception réussie
  useEffect(() => {
    if (isAudioReceived) {
      const timer = setTimeout(() => {
        setIsOpen(false);
        setIsAudioReceived(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isAudioReceived]);

  // Générer une nouvelle session
  const generateSession = () => {
    const newSessionId = audioTransferService.createSession(userId);
    setCurrentSessionId(newSessionId);
    setQrUrl(
      `${window.location.origin}/mobile-record?sessionId=${newSessionId}${userId ? `&userId=${userId}` : ""}`
    );
    setStatusMessage("En attente d'un enregistrement...");
    setIsPolling(true);
    console.log(`Nouvelle session créée: ${newSessionId}`);
  };

  // Vérifier si l'enregistrement est disponible
  const checkForRecording = async (sessionId: string) => {
    if (await audioTransferService.isRecordingReady(sessionId, userId)) {
      const audioBlob = await audioTransferService.downloadRecording(sessionId);

      if (audioBlob) {
        setIsPolling(false);
        setIsAudioReceived(true);
        setStatusMessage("Enregistrement reçu!");
        onAudioReceived(audioBlob);
      }
    }
  };

  // Réinitialiser la session
  const resetSession = () => {
    setIsPolling(false);
    setQrUrl(null);
    setCurrentSessionId(null);
    setStatusMessage(null);
    setIsAudioReceived(false);
    generateSession();
  };

  // Ouvrir la modale
  const handleOpenModal = () => {
    setIsOpen(true);
  };

  return (
    <>
      <Button onClick={handleOpenModal} className="flex items-center gap-2">
        <Mic className="h-4 w-4" />
        Enregistrer sur mobile
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle>Enregistrement depuis mobile</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center space-y-4 py-4">
            <div className="text-center mb-2">
              <p className="text-muted-foreground">
                Utilisez votre téléphone pour enregistrer l'audio, puis
                traitez-le directement sur votre ordinateur.
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm w-full">
              {qrUrl && (
                <>
                  <div className="flex justify-center">
                    <QRCodeSVG value={qrUrl} size={200} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    Scannez ce QR code avec votre téléphone pour enregistrer
                    l'audio
                  </p>
                </>
              )}

              {isPolling && !isAudioReceived && (
                <div className="flex flex-col items-center justify-center mt-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span>En attente de l'audio...</span>
                  </div>
                  {statusMessage && (
                    <span className="text-xs mt-1">{statusMessage}</span>
                  )}
                </div>
              )}

              {isAudioReceived && (
                <div className="flex flex-col items-center justify-center mt-4 text-green-600">
                  <CheckCircle className="h-8 w-8 mb-2" />
                  <p className="text-sm font-medium">Audio reçu avec succès!</p>
                </div>
              )}
            </div>

            {!isAudioReceived && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetSession}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Générer un nouveau QR code
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
