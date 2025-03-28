import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { aiService } from "@/lib/services/ai.service";
import { Mic, Loader2, CheckCircle, XCircle } from "lucide-react";
import { generateQRCodeUrl } from "@/components/QRCodeGenerator";

interface MobileRecordButtonProps {
  onAudioReceived: (audioBlob: Blob) => void;
}

export function MobileRecordButton({
  onAudioReceived,
}: MobileRecordButtonProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string>("");
  const [status, setStatus] = useState<
    "idle" | "waiting" | "received" | "error"
  >("idle");
  const [checkInterval, setCheckInterval] = useState<NodeJS.Timeout | null>(
    null
  );

  // Cleanup sur démontage
  useEffect(() => {
    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [checkInterval]);

  // Créer une nouvelle session d'enregistrement mobile
  const handleCreateSession = () => {
    // Générer un nouvel identifiant de session
    const newSessionId = aiService.createMobileSession();
    setSessionId(newSessionId);

    // Générer l'URL pour le QR code
    const url = generateQRCodeUrl(newSessionId);
    setQrUrl(url);

    // Définir le statut sur en attente
    setStatus("waiting");

    // Démarrer la vérification périodique pour voir si l'audio est disponible
    const interval = setInterval(() => {
      if (aiService.isValidMobileSession(newSessionId)) {
        // Récupérer l'audio s'il est disponible
        const audioBlob = aiService.getMobileAudio(newSessionId);
        if (audioBlob) {
          clearInterval(interval);
          setStatus("received");
          onAudioReceived(audioBlob);
        }
      } else {
        // La session a expiré sans recevoir d'audio
        clearInterval(interval);
        setStatus("error");
      }
    }, 2000); // Vérifier toutes les 2 secondes

    setCheckInterval(interval);
  };

  // Annuler la session en cours
  const handleCancel = () => {
    if (checkInterval) {
      clearInterval(checkInterval);
    }
    setSessionId(null);
    setQrUrl("");
    setStatus("idle");
  };

  // Réinitialiser pour démarrer une nouvelle session
  const handleReset = () => {
    setSessionId(null);
    setQrUrl("");
    setStatus("idle");
  };

  // Affichage selon l'état
  if (status === "idle") {
    return (
      <Button onClick={handleCreateSession} className="flex items-center gap-2">
        <Mic className="h-4 w-4" />
        Enregistrer depuis mobile
      </Button>
    );
  }

  if (status === "waiting") {
    return (
      <div className="p-4 border rounded-lg flex flex-col items-center gap-4">
        <div className="text-center">
          <h3 className="font-medium mb-1">
            Scannez ce code QR avec votre téléphone
          </h3>
          <p className="text-sm text-muted-foreground">
            Puis enregistrez votre audio et appuyez sur STOP pour l'envoyer
          </p>
        </div>

        <div className="bg-white p-3 rounded">
          <QRCodeSVG value={qrUrl} size={200} />
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>En attente de l'audio...</span>
        </div>

        <Button variant="outline" onClick={handleCancel}>
          Annuler
        </Button>
      </div>
    );
  }

  if (status === "received") {
    return (
      <div className="p-4 border rounded-lg flex flex-col items-center gap-4 border-green-200 bg-green-50">
        <CheckCircle className="h-8 w-8 text-green-500" />
        <div className="text-center">
          <h3 className="font-medium">Audio reçu avec succès</h3>
          <p className="text-sm text-muted-foreground">
            L'enregistrement a été transféré et est prêt à être utilisé
          </p>
        </div>
        <Button onClick={handleReset}>Nouvel enregistrement</Button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="p-4 border rounded-lg flex flex-col items-center gap-4 border-red-200 bg-red-50">
        <XCircle className="h-8 w-8 text-red-500" />
        <div className="text-center">
          <h3 className="font-medium">Erreur de réception</h3>
          <p className="text-sm text-muted-foreground">
            Aucun audio reçu ou la session a expiré
          </p>
        </div>
        <Button onClick={handleReset}>Réessayer</Button>
      </div>
    );
  }

  return null;
}
