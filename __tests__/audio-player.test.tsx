import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AudioPlayer from '@/pages/AudioPlayer';
import { useAudioPlayerStore, AudioTrack } from '@/store/audioPlayerStore';

const makeTracks = (n: number): AudioTrack[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `t${i}`,
    deckId: `chinese_chpt${i + 1}_1`,
    type: i % 2 === 0 ? 'phrases' : 'dialogue',
    filename: `t${i}.txt`,
    displayName: `Track ${i}`,
    audioFile: `t${i}.mp3`,
    chapterNumber: i + 1,
    partNumber: 1,
  }));

// Silence fetch-of-manifest in AudioPlayer mount; the store is preloaded.
beforeEach(() => {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    json: async () => ({ transcripts: [] }),
  });
  // Reset store
  useAudioPlayerStore.setState({
    tracks: [],
    currentTrackIndex: 0,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 100,
  });
});

const playStub = vi.fn().mockResolvedValue(undefined);
const pauseStub = vi.fn();
const loadStub = vi.fn();
// Install audio element prototype stubs once.
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  configurable: true,
  value: playStub,
});
Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  value: pauseStub,
});
Object.defineProperty(HTMLMediaElement.prototype, 'load', {
  configurable: true,
  value: loadStub,
});
// jsdom has no scrollIntoView on elements; stub to a no-op.
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  configurable: true,
  value: vi.fn(),
});

describe('audioPlayerStore', () => {
  beforeEach(() => {
    useAudioPlayerStore.setState({
      tracks: makeTracks(3),
      currentTrackIndex: 0,
      isPlaying: false,
      currentTime: 42,
      duration: 100,
      playbackRate: 100,
    });
  });

  it('nextTrack advances from middle and marks playing', () => {
    useAudioPlayerStore.setState({ currentTrackIndex: 1, isPlaying: true });
    useAudioPlayerStore.getState().nextTrack();
    const s = useAudioPlayerStore.getState();
    expect(s.currentTrackIndex).toBe(2);
    expect(s.isPlaying).toBe(true);
    expect(s.currentTime).toBe(0);
  });

  it('nextTrack at last index is a no-op (does not wrap)', () => {
    useAudioPlayerStore.setState({ currentTrackIndex: 2, isPlaying: true, currentTime: 7 });
    useAudioPlayerStore.getState().nextTrack();
    const s = useAudioPlayerStore.getState();
    expect(s.currentTrackIndex).toBe(2);
    expect(s.currentTime).toBe(7); // untouched
  });

  it('setPlaybackRate only mutates playbackRate, never currentTime', () => {
    useAudioPlayerStore.setState({ currentTime: 55, playbackRate: 100 });
    useAudioPlayerStore.getState().setPlaybackRate(125);
    const s = useAudioPlayerStore.getState();
    expect(s.playbackRate).toBe(125);
    expect(s.currentTime).toBe(55);
  });
});

describe('AudioPlayer component', () => {
  beforeEach(() => {
    playStub.mockClear();
    pauseStub.mockClear();
    loadStub.mockClear();
    useAudioPlayerStore.setState({
      tracks: makeTracks(3),
      currentTrackIndex: 0,
      isPlaying: true,
      currentTime: 0,
      duration: 0,
      playbackRate: 100,
    });
  });

  const renderIt = () =>
    render(
      <MemoryRouter>
        <AudioPlayer />
      </MemoryRouter>
    );

  it('auto-advances to next track when the <audio> "ended" event fires mid-playlist', async () => {
    const { container } = renderIt();
    const audio = container.querySelector('audio') as HTMLAudioElement;
    expect(audio).toBeTruthy();

    // Start at index 0 → simulate natural end.
    await act(async () => {
      audio.dispatchEvent(new Event('ended'));
    });
    expect(useAudioPlayerStore.getState().currentTrackIndex).toBe(1);
    expect(useAudioPlayerStore.getState().isPlaying).toBe(true);

    // End track 1 → advance to 2.
    await act(async () => {
      audio.dispatchEvent(new Event('ended'));
    });
    expect(useAudioPlayerStore.getState().currentTrackIndex).toBe(2);
    expect(useAudioPlayerStore.getState().isPlaying).toBe(true);
  });

  it('stops cleanly at end of playlist (does not wrap, clears isPlaying)', async () => {
    useAudioPlayerStore.setState({ currentTrackIndex: 2, isPlaying: true });
    const { container } = renderIt();
    const audio = container.querySelector('audio') as HTMLAudioElement;

    await act(async () => {
      audio.dispatchEvent(new Event('ended'));
    });

    expect(useAudioPlayerStore.getState().currentTrackIndex).toBe(2);
    expect(useAudioPlayerStore.getState().isPlaying).toBe(false);
  });

  it('adjusting speed does not rewind the audio element (currentTime preserved)', async () => {
    const { container, getByLabelText } = renderIt();
    const audio = container.querySelector('audio') as HTMLAudioElement;

    // Simulate that playback has progressed to 17s.
    Object.defineProperty(audio, 'currentTime', {
      configurable: true,
      get() {
        return (this as any)._ct ?? 0;
      },
      set(v: number) {
        (this as any)._ct = v;
      },
    });
    audio.currentTime = 17;

    // Bump speed via the slider.
    const slider = getByLabelText('Playback speed') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(slider, { target: { value: '125' } });
    });

    expect(useAudioPlayerStore.getState().playbackRate).toBe(125);
    expect(audio.playbackRate).toBeCloseTo(1.25, 5);
    // The key assertion: the track did not restart from 0.
    expect(audio.currentTime).toBe(17);
  });
});
