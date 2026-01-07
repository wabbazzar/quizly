/**
 * Zustand store for transcript state management
 * Handles loading, selecting, and displaying transcript files
 */

import { create } from 'zustand';
import { TranscriptFile } from '@/types';
import {
  getTranscriptsForDeck,
  loadTranscriptContent,
} from '@/services/transcriptService';

interface TranscriptState {
  // State
  availableTranscripts: TranscriptFile[];
  selectedTranscript: TranscriptFile | null;
  transcriptContent: string | null;
  isLoading: boolean;
  isLoadingContent: boolean;
  error: string | null;
  isModalOpen: boolean;

  // Actions
  loadTranscriptsForDeck: (deckId: string) => Promise<void>;
  selectTranscript: (transcript: TranscriptFile) => Promise<void>;
  closeModal: () => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  availableTranscripts: [],
  selectedTranscript: null,
  transcriptContent: null,
  isLoading: false,
  isLoadingContent: false,
  error: null,
  isModalOpen: false,
};

export const useTranscriptStore = create<TranscriptState>((set) => ({
  ...initialState,

  loadTranscriptsForDeck: async (deckId: string) => {
    set({ isLoading: true, error: null });
    try {
      const transcripts = await getTranscriptsForDeck(deckId);
      set({ availableTranscripts: transcripts, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load transcripts',
        isLoading: false,
        availableTranscripts: [],
      });
    }
  },

  selectTranscript: async (transcript: TranscriptFile) => {
    set({
      selectedTranscript: transcript,
      isLoadingContent: true,
      error: null,
      isModalOpen: true,
      transcriptContent: null,
    });
    try {
      const content = await loadTranscriptContent(transcript.filename);
      set({ transcriptContent: content, isLoadingContent: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load transcript content',
        isLoadingContent: false,
      });
    }
  },

  closeModal: () => {
    set({
      isModalOpen: false,
      selectedTranscript: null,
      transcriptContent: null,
      error: null,
    });
  },

  clearError: () => set({ error: null }),

  reset: () => set(initialState),
}));
