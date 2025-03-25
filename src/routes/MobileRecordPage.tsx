import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, StopCircle } from "lucide-react";
import { useAIService } from "@/lib/services/ai.service";
import { useSearchParams } from "react-router-dom";
import { aiService } from "@/lib/services/ai.service";

export function MobileRecordPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  const { startRecording, stopRecording, formatTime, isProcessing } =
    useAIService();

  // Timer pour l'enregistrement
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const handleRecord = async () => {
    try {
      if (isRecording) {
        const audioBlob = await stopRecording("whisper");
        if (audioBlob && sessionId) {
          aiService.storeMobileAudio(sessionId, audioBlob);
        }
        setIsRecording(false);
      } else {
        await startRecording();
        setIsRecording(true);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de l'enregistrement"
      );
      setIsRecording(false);
    }
  };

  if (!sessionId) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">Session invalide</p>
      </div>
    );
  }

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
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md">{error}</div>
        )}

        <div className="flex flex-col items-center space-y-4">
          {isRecording && (
            <div className="text-2xl font-mono">
              {formatTime(recordingTime)}
            </div>
          )}

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
