import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { audioTransferService } from "@/lib/services/audioTransfer.service";
import { ref, listAll, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase/config";

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

  useEffect(() => {
    generateSession();
  }, []);

  // Vérifier directement dans Firebase Storage si un fichier existe
  const checkFirebaseStorage = async (
    sessionId: string
  ): Promise<string | null> => {
    try {
      console.log(
        `Tentative de trouver le fichier pour la session: ${sessionId}`
      );

      // Essayer toutes les extensions possibles
      const extensions = ["webm", "mp3", "mp4", "wav", "ogg"];

      for (const ext of extensions) {
        try {
          // Vérifier directement si le fichier existe avec cette extension
          const fileRef = ref(storage, `recordings/${sessionId}.${ext}`);
          console.log(
            `Vérification de l'existence de: recordings/${sessionId}.${ext}`
          );

          // Si getDownloadURL réussit, le fichier existe
          const url = await getDownloadURL(fileRef);
          console.log(`✅ Fichier trouvé! URL: ${url}`);
          return url;
        } catch (error) {
          // Fichier non trouvé avec cette extension, essayer la suivante
          console.log(
            `❌ Fichier non trouvé avec extension .${ext}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // Si on arrive ici, essayons de lister tous les fichiers du dossier pour le débogage
      console.log("Listing de tous les fichiers dans le dossier 'recordings':");
      const folderRef = ref(storage, "recordings");
      const result = await listAll(folderRef);

      if (result.items.length === 0) {
        console.log("Le dossier 'recordings' est vide!");
      } else {
        console.log(
          "Fichiers trouvés dans 'recordings':",
          result.items.map((item) => item.name).join(", ")
        );

        // Rechercher un fichier qui contient l'ID de session comme préfixe
        let matchingFile = result.items.find((item) =>
          item.name.startsWith(sessionId)
        );

        if (matchingFile) {
          console.log(
            `🔍 Fichier correspondant trouvé par préfixe: ${matchingFile.name}`
          );
        }

        // Si pas trouvé, chercher comme sous-chaîne
        if (!matchingFile) {
          matchingFile = result.items.find((item) =>
            item.name.includes(sessionId)
          );

          if (matchingFile) {
            console.log(
              `🔍 Fichier correspondant trouvé par sous-chaîne: ${matchingFile.name}`
            );
          }
        }

        // Si pas trouvé comme sous-chaîne, vérifier si l'ID contient le nom du fichier
        // (après avoir enlevé l'extension)
        if (!matchingFile) {
          for (const item of result.items) {
            // Extraire le nom du fichier sans extension
            const fileName = item.name.split(".")[0];
            if (fileName && sessionId.includes(fileName)) {
              matchingFile = item;
              console.log(
                `🔍 Fichier correspondant trouvé par inversion: l'ID ${sessionId} contient le nom du fichier ${fileName}`
              );
              break;
            }
          }
        }

        if (matchingFile) {
          const url = await getDownloadURL(matchingFile);
          return url;
        }
      }

      return null;
    } catch (error) {
      console.error(
        "Erreur lors de la vérification dans Firebase Storage:",
        error
      );
      return null;
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
        // Pour les 10 premières tentatives, afficher l'ID de session en entier
        if (pollingCount <= 10) {
          console.log(`Session actuelle: "${currentSessionId}"`);
        }

        // Méthode 1 : Vérifier via notre service
        const isReady =
          await audioTransferService.isRecordingReady(currentSessionId);

        if (isReady) {
          setStatusMessage("Enregistrement trouvé, téléchargement en cours...");
          const audioBlob =
            await audioTransferService.downloadRecording(currentSessionId);

          if (audioBlob) {
            console.log("Audio téléchargé avec succès via service");
            onAudioReceived(audioBlob);
            setIsPolling(false);
            generateSession();
            return;
          }
        }

        // Méthode 2 : Vérifier directement dans Firebase Storage
        setStatusMessage("Recherche directe dans Firebase Storage...");
        const downloadURL = await checkFirebaseStorage(currentSessionId);

        if (downloadURL) {
          setStatusMessage("Fichier trouvé, téléchargement en cours...");

          try {
            const response = await fetch(downloadURL);
            if (response.ok) {
              const blob = await response.blob();
              console.log("Audio téléchargé avec succès via Firebase direct");
              onAudioReceived(blob);
              setIsPolling(false);
              generateSession();
              return;
            } else {
              console.error(
                "Erreur lors du téléchargement:",
                response.statusText
              );
            }
          } catch (error) {
            console.error("Erreur lors du téléchargement:", error);
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
