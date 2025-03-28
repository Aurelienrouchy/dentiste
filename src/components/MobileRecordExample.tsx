import { useState, useRef } from "react";
import { MobileRecordButton } from "./MobileRecordButton";
import { Button } from "@/components/ui/button";
import { PlayCircle, PauseCircle, CheckCircle } from "lucide-react";
import { useAIService } from "@/lib/services/ai.service";

export function MobileRecordExample() {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { transcribeAudio } = useAIService();

  // Gestionnaire pour recevoir l'audio du téléphone
  const handleAudioReceived = (blob: Blob) => {
    setAudioBlob(blob);

    // Créer un URL pour le blob audio
    const audioUrl = URL.createObjectURL(blob);

    // Mettre à jour la source audio
    if (audioRef.current) {
      audioRef.current.src = audioUrl;
    }
  };

  // Lire l'audio reçu
  const handlePlayAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
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
          <MobileRecordButton onAudioReceived={handleAudioReceived} />
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

          {!transcript ? (
            <div className="flex justify-center">
              <Button
                onClick={handleTranscribe}
                disabled={isTranscribing}
                className="flex items-center gap-2"
              >
                {isTranscribing ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></div>
                    <span>Transcription en cours...</span>
                  </>
                ) : (
                  <span>Transcrire l'audio</span>
                )}
              </Button>
            </div>
          ) : (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-medium">Transcription</h3>
              </div>
              <p className="text-sm">{transcript}</p>
            </div>
          )}

          <div className="flex justify-center mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setAudioBlob(null);
                setTranscript(null);
                if (audioRef.current) {
                  audioRef.current.src = "";
                }
              }}
            >
              Nouvel enregistrement
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
