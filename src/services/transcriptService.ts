/**
 * Service for loading and managing transcript files
 * Transcripts are raw text files for external TTS readers like Speechify
 */

import { TranscriptFile, TranscriptManifest } from '@/types';

const TRANSCRIPTS_BASE_PATH = '/data/transcripts';

let manifestCache: TranscriptManifest | null = null;

/**
 * Load the transcript manifest (cached after first load)
 */
export async function loadTranscriptManifest(): Promise<TranscriptManifest> {
  if (manifestCache) {
    return manifestCache;
  }

  const response = await fetch(`${TRANSCRIPTS_BASE_PATH}/manifest.json`);
  if (!response.ok) {
    throw new Error('Failed to load transcript manifest');
  }

  manifestCache = await response.json();
  return manifestCache as TranscriptManifest;
}

/**
 * Get all transcripts for a specific deck
 */
export async function getTranscriptsForDeck(deckId: string): Promise<TranscriptFile[]> {
  const manifest = await loadTranscriptManifest();
  return manifest.transcripts.filter(t => t.deckId === deckId);
}

/**
 * Load the text content of a transcript file
 */
export async function loadTranscriptContent(filename: string): Promise<string> {
  const response = await fetch(`${TRANSCRIPTS_BASE_PATH}/${filename}`);
  if (!response.ok) {
    throw new Error(`Failed to load transcript: ${filename}`);
  }
  return response.text();
}

/**
 * Clear the manifest cache (useful for testing or forcing reload)
 */
export function clearManifestCache(): void {
  manifestCache = null;
}

/**
 * Check if any transcripts exist for a deck
 */
export async function hasTranscriptsForDeck(deckId: string): Promise<boolean> {
  const transcripts = await getTranscriptsForDeck(deckId);
  return transcripts.length > 0;
}
