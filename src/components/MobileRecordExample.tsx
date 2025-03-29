import { useState, useRef, useEffect } from "react";
import { MobileRecordQRCode } from "./MobileRecordQRCode";
import { Button } from "@/components/ui/button";
import { PlayCircle, PauseCircle, CheckCircle } from "lucide-react";
import { useAIService } from "@/lib/services/ai.service";
import {
  safePlay,
  safePause,
  createAudioUrl,
  revokeAudioUrl,
} from "@/lib/utils/audio-helpers";

export function MobileRecordExample() {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const { transcribeAudio } = useAIService();

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        revokeAudioUrl(audioUrl);
      }
    };
  }, [audioUrl]);

  // Gestionnaire pour recevoir l'audio du téléphone
  const handleAudioReceived = (blob: Blob) => {
    setAudioBlob(blob);

    // Cleanup any existing audio URL
    if (audioUrl) {
      revokeAudioUrl(audioUrl);
    }

    // Créer un URL pour le blob audio
    const newAudioUrl = createAudioUrl(blob);
    setAudioUrl(newAudioUrl);

    // Mettre à jour la source audio
    if (audioRef.current) {
      audioRef.current.src = newAudioUrl;
    }
  };

  // Lire l'audio reçu
  const handlePlayAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        safePause(audioRef.current);
        setIsPlaying(false);
      } else {
        safePlay(audioRef.current)
          .then(() => {
            setIsPlaying(true);
          })
          .catch((error) => {
            console.error("Error playing audio:", error);
            setIsPlaying(false);
          });
      }
    }
  };

  // Gestionnaire pour la fin de lecture
  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  // Transcrire l'audio
  const handleTranscribe = async () => {
    if (audioBlob) {
      try {
        setIsTranscribing(true);
        const result = await transcribeAudio(audioBlob, "whisper");
        setTranscript(result.text);
      } catch (error) {
        console.error("Erreur de transcription:", error);
      } finally {
        setIsTranscribing(false);
      }
    }
  };

  // Cleanup resources
  const cleanupResources = () => {
    if (audioRef.current) {
      audioRef.current.src = "";
    }

    if (audioUrl) {
      revokeAudioUrl(audioUrl);
      setAudioUrl(null);
    }

    setAudioBlob(null);
    setTranscript(null);
  };

  return (
    <div className="p-6 border rounded-lg space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Enregistrement Mobile</h2>
        <p className="text-muted-foreground">
          Enregistrez l'audio depuis votre téléphone et utilisez-le sur votre
          ordinateur
        </p>
      </div>

      {!audioBlob ? (
        <div className="flex justify-center">
          <MobileRecordQRCode onAudioReceived={handleAudioReceived} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-center items-center gap-4">
            <audio ref={audioRef} onEnded={handleAudioEnded} />

            <Button
              onClick={handlePlayAudio}
              variant="outline"
              size="icon"
              className="w-12 h-12 rounded-full"
            >
              {isPlaying ? (
                <PauseCircle className="h-8 w-8" />
              ) : (
                <PlayCircle className="h-8 w-8" />
              )}
            </Button>

            <div className="text-sm text-muted-foreground">
              {isPlaying ? "Lecture en cours..." : "Cliquez pour écouter"}
            </div>
          </div>

          {!transcript && (
            <div className="flex justify-center">
              <Button
                onClick={handleTranscribe}
                disabled={isTranscribing}
                className="flex items-center gap-2"
              >
                {isTranscribing ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                    Transcription...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Transcrire l'audio
                  </>
                )}
              </Button>
            </div>
          )}

          {transcript && (
            <div className="p-4 border rounded-lg bg-muted/30">
              <h3 className="font-medium mb-2">Transcription :</h3>
              <p className="text-sm">{transcript}</p>
            </div>
          )}

          <div className="flex justify-center mt-4">
            <Button variant="outline" onClick={cleanupResources}>
              Effacer et recommencer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
