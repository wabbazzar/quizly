import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AudioTrack {
  id: string;
  deckId: string;
  type: 'phrases' | 'dialogue';
  filename: string;
  displayName: string;
  audioFile: string;
  displayTitle: string;
  sortOrder: number;
}

interface AudioPlayerState {
  tracks: AudioTrack[];
  currentTrackIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  repeat: boolean;

  // Actions
  setTracks: (tracks: AudioTrack[]) => void;
  setCurrentTrackIndex: (index: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setPlaybackRate: (rate: number) => void;
  playTrack: (index: number) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  togglePlay: () => void;
  toggleRepeat: () => void;
}

export const useAudioPlayerStore = create<AudioPlayerState>()(
  persist(
    (set, get) => ({
      tracks: [],
      currentTrackIndex: 0,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      playbackRate: 100,
      repeat: false,

      setTracks: (tracks) => set({ tracks }),

      setCurrentTrackIndex: (index) => set({ currentTrackIndex: index }),

      setIsPlaying: (playing) => set({ isPlaying: playing }),

      setCurrentTime: (time) => set({ currentTime: time }),

      setDuration: (duration) => set({ duration: duration }),

      setPlaybackRate: (rate) => set({ playbackRate: rate }),

      playTrack: (index) => {
        const { tracks } = get();
        if (index >= 0 && index < tracks.length) {
          set({ currentTrackIndex: index, isPlaying: true, currentTime: 0 });
        }
      },

      nextTrack: () => {
        const { tracks, currentTrackIndex } = get();
        if (currentTrackIndex < tracks.length - 1) {
          set({ currentTrackIndex: currentTrackIndex + 1, isPlaying: true, currentTime: 0 });
        }
      },

      previousTrack: () => {
        const { currentTrackIndex, currentTime } = get();
        // If more than 3 seconds into the track, restart it instead
        if (currentTime > 3) {
          set({ currentTime: 0 });
        } else if (currentTrackIndex > 0) {
          set({ currentTrackIndex: currentTrackIndex - 1, isPlaying: true, currentTime: 0 });
        }
      },

      togglePlay: () => {
        const { isPlaying } = get();
        set({ isPlaying: !isPlaying });
      },

      toggleRepeat: () => {
        set({ repeat: !get().repeat });
      },
    }),
    {
      name: 'audio-player-store',
      partialize: (state) => ({
        currentTrackIndex: state.currentTrackIndex,
        playbackRate: state.playbackRate,
        repeat: state.repeat,
      }),
    }
  )
);

// Transforms manifest entries into AudioTrack[] preserving the manifest's
// order (already sorted by the generator).
export function transformManifestToTracks(
  transcripts: Array<{
    id: string;
    deckId: string;
    type: string;
    filename: string;
    displayName: string;
    audioFile?: string;
    displayTitle?: string;
    sortOrder?: number;
  }>
): AudioTrack[] {
  return transcripts
    .filter((t) => t.audioFile && (t.type === 'phrases' || t.type === 'dialogue'))
    .map((t) => ({
      id: t.id,
      deckId: t.deckId,
      type: t.type as 'phrases' | 'dialogue',
      filename: t.filename,
      displayName: t.displayName,
      audioFile: t.audioFile!,
      displayTitle: t.displayTitle ?? t.deckId,
      sortOrder: t.sortOrder ?? 0,
    }));
}

// Sort by deck sortOrder, then phrases before dialogue. Optionally floats a
// set of pinned deck IDs to the top (preserving original relative order
// within each partition).
export function sortTracks(tracks: AudioTrack[], pinnedDeckIds: string[] = []): AudioTrack[] {
  const byOrder = [...tracks].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    if (a.type !== b.type) return a.type === 'phrases' ? -1 : 1;
    return 0;
  });

  if (pinnedDeckIds.length === 0) return byOrder;

  const pinnedSet = new Set(pinnedDeckIds);
  const pinned: AudioTrack[] = [];
  const unpinned: AudioTrack[] = [];
  for (const t of byOrder) {
    (pinnedSet.has(t.deckId) ? pinned : unpinned).push(t);
  }
  return pinned.length > 0 ? [...pinned, ...unpinned] : byOrder;
}
