import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AudioTrack {
  id: string;
  deckId: string;
  type: 'phrases' | 'dialogue';
  filename: string;
  displayName: string;
  audioFile: string;
  chapterNumber: number;
  partNumber: number;
}

interface AudioPlayerState {
  tracks: AudioTrack[];
  currentTrackIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;

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
    }),
    {
      name: 'audio-player-store',
      partialize: (state) => ({
        currentTrackIndex: state.currentTrackIndex,
        playbackRate: state.playbackRate,
      }),
    }
  )
);

// Helper function to parse chapter and part from deckId
function parseChapterInfo(deckId: string): { chapter: number; part: number } {
  // Format: chinese_chptX_Y where X is chapter and Y is part
  const match = deckId.match(/chinese_chpt(\d+)_(\d+)/);
  if (match) {
    return { chapter: parseInt(match[1], 10), part: parseInt(match[2], 10) };
  }
  return { chapter: 0, part: 0 };
}

// Function to sort tracks: by chapter, then part, alternating phrases/dialogue
export function sortTracksAlternating(tracks: AudioTrack[]): AudioTrack[] {
  // First, group by chapter and part
  const grouped = new Map<string, { phrases?: AudioTrack; dialogue?: AudioTrack }>();

  tracks.forEach((track) => {
    const key = `${track.chapterNumber}_${track.partNumber}`;
    if (!grouped.has(key)) {
      grouped.set(key, {});
    }
    const group = grouped.get(key)!;
    if (track.type === 'phrases') {
      group.phrases = track;
    } else {
      group.dialogue = track;
    }
  });

  // Sort keys by chapter and part
  const sortedKeys = Array.from(grouped.keys()).sort((a, b) => {
    const [chapterA, partA] = a.split('_').map(Number);
    const [chapterB, partB] = b.split('_').map(Number);
    if (chapterA !== chapterB) return chapterA - chapterB;
    return partA - partB;
  });

  // Build sorted array alternating phrases then dialogue
  const sorted: AudioTrack[] = [];
  sortedKeys.forEach((key) => {
    const group = grouped.get(key)!;
    if (group.phrases) sorted.push(group.phrases);
    if (group.dialogue) sorted.push(group.dialogue);
  });

  return sorted;
}

// Function to transform manifest data to AudioTrack[]
export function transformManifestToTracks(
  transcripts: Array<{
    id: string;
    deckId: string;
    type: string;
    filename: string;
    displayName: string;
    audioFile?: string;
  }>
): AudioTrack[] {
  return transcripts
    .filter((t) => t.audioFile && (t.type === 'phrases' || t.type === 'dialogue'))
    .map((t) => {
      const { chapter, part } = parseChapterInfo(t.deckId);
      return {
        id: t.id,
        deckId: t.deckId,
        type: t.type as 'phrases' | 'dialogue',
        filename: t.filename,
        displayName: t.displayName,
        audioFile: t.audioFile!,
        chapterNumber: chapter,
        partNumber: part,
      };
    });
}
