/**
 * Helper functions for safely handling audio playback
 */

/**
 * Safely play an audio element by properly handling the Promise returned by play()
 * @param audioElement The HTML audio element to play
 * @returns A promise that resolves when the audio starts playing or rejects if it fails
 */
export async function safePlay(audioElement: HTMLAudioElement): Promise<void> {
  if (!audioElement)
    return Promise.reject(new Error("No audio element provided"));

  try {
    // Store the play promise to properly handle it
    const playPromise = audioElement.play();

    // Modern browsers return a promise from play()
    if (playPromise !== undefined) {
      return playPromise;
    }

    // For older browsers that don't return a promise
    return Promise.resolve();
  } catch (error) {
    console.error("Error playing audio:", error);
    return Promise.reject(error);
  }
}

/**
 * Safely pause an audio element
 * @param audioElement The HTML audio element to pause
 */
export function safePause(audioElement: HTMLAudioElement): void {
  if (!audioElement) return;

  // Just pause the audio - no promises to handle here
  audioElement.pause();
}

/**
 * Create a blob URL from an audio blob
 * @param blob The audio blob
 * @returns The URL created for the blob
 */
export function createAudioUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * Clean up a blob URL when no longer needed
 * @param url The blob URL to revoke
 */
export function revokeAudioUrl(url: string): void {
  if (url && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}
