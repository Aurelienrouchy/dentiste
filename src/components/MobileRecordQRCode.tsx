import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { aiService } from "@/lib/services/ai.service";

interface MobileRecordQRCodeProps {
  onAudioReceived: (audioBlob: Blob) => void;
}

export function MobileRecordQRCode({
  onAudioReceived,
}: MobileRecordQRCodeProps) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const generateSession = () => {
    const newSessionId = aiService.createMobileSession();
    setCurrentSessionId(newSessionId);
    setQrUrl(
      `${window.location.origin}/mobile-record?sessionId=${newSessionId}`
    );
  };

  useEffect(() => {
    generateSession();
  }, []);

  // Polling pour vérifier si l'audio est disponible
  useEffect(() => {
    if (!currentSessionId) return;

    const checkAudio = async () => {
      const audioBlob = aiService.getMobileAudio(currentSessionId);
      if (audioBlob) {
        onAudioReceived(audioBlob);
        generateSession(); // Générer une nouvelle session
      }
    };

    const interval = setInterval(checkAudio, 2000); // Vérifier toutes les 2 secondes

    return () => clearInterval(interval);
  }, [currentSessionId, onAudioReceived]);

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
