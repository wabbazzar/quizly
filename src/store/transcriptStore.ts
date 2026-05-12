/**
 * Zustand store for transcript state management
 * Handles loading, selecting, and displaying transcript files
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
  // Audio-player settings — persisted across modal close/reopen and switching
  // between dialogue/phrases so the user's preferences stick.
  playbackRate: number;
  repeat: boolean;

  // Actions
  loadTranscriptsForDeck: (deckId: string) => Promise<void>;
  selectTranscript: (transcript: TranscriptFile) => Promise<void>;
  closeModal: () => void;
  clearError: () => void;
  setPlaybackRate: (rate: number) => void;
  setRepeat: (repeat: boolean) => void;
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
  playbackRate: 100,
  repeat: false,
};

export const useTranscriptStore = create<TranscriptState>()(
  persist(
    (set) => ({
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

      setPlaybackRate: (rate: number) => set({ playbackRate: rate }),

      setRepeat: (repeat: boolean) => set({ repeat }),

      reset: () => set(initialState),
    }),
    {
      name: 'transcript-store',
      partialize: (state) => ({
        playbackRate: state.playbackRate,
        repeat: state.repeat,
      }),
    }
  )
);
