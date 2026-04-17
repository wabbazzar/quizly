import { FC, useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useAudioPlayerStore,
  transformManifestToTracks,
  sortTracksAlternating,
  AudioTrack,
} from '@/store/audioPlayerStore';
import {
  PlayFilledIcon,
  PauseFilledIcon,
  PreviousTrackIcon,
  NextTrackIcon,
  RepeatIcon,
} from '@/components/icons/ModeIcons';
import { ArrowLeftIcon } from '@/components/icons/NavigationIcons';
import styles from './AudioPlayer.module.css';

const BASE_URL = import.meta.env.BASE_URL || '/';

const AudioPlayer: FC = () => {
  const navigate = useNavigate();
  const {
    tracks,
    setTracks,
    currentTrackIndex,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    repeat,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setPlaybackRate,
    playTrack,
    nextTrack,
    previousTrack,
    togglePlay,
    toggleRepeat,
  } = useAudioPlayerStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const trackListRef = useRef<HTMLDivElement>(null);
  const currentSrcRef = useRef<string>('');
  const isPlayingRef = useRef(isPlaying);
  const playbackRateRef = useRef(playbackRate);
  const [isLoading, setIsLoading] = useState(true);
  const isTransitioningRef = useRef(false);

  // Keep refs in sync for use in effects that shouldn't re-run on these changes
  isPlayingRef.current = isPlaying;
  playbackRateRef.current = playbackRate;

  // Load tracks from manifest on mount
  useEffect(() => {
    const loadTracks = async () => {
      try {
        const response = await fetch(`${BASE_URL}data/transcripts/manifest.json`);
        const data = await response.json();
        const audioTracks = transformManifestToTracks(data.transcripts);
        const sortedTracks = sortTracksAlternating(audioTracks);
        setTracks(sortedTracks);
      } catch (error) {
        console.error('Failed to load audio tracks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (tracks.length === 0) {
      loadTracks();
    } else {
      setIsLoading(false);
    }
  }, [setTracks, tracks.length]);

  // Handle audio element events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      // Auto-advance to next track on natural end. Read fresh state from the
      // store (not the closed-over values) to handle the end-of-playlist edge
      // case correctly.
      const { tracks, currentTrackIndex, repeat } = useAudioPlayerStore.getState();
      if (currentTrackIndex < tracks.length - 1) {
        // Set flag to prevent the browser's pause event (fired alongside
        // ended) from flipping isPlaying to false before nextTrack() sets it
        // back to true.
        isTransitioningRef.current = true;
        nextTrack();
        setTimeout(() => {
          isTransitioningRef.current = false;
        }, 100);
      } else if (repeat && tracks.length > 0) {
        // End of playlist with repeat on: wrap to the first track and keep playing.
        isTransitioningRef.current = true;
        if (tracks.length === 1) {
          // Single-track playlist: store index doesn't change, so the
          // source-change effect won't fire. Rewind and resume the audio
          // element directly.
          audio.currentTime = 0;
          audio.play().catch(() => setIsPlaying(false));
        } else {
          useAudioPlayerStore.getState().playTrack(0);
        }
        setTimeout(() => {
          isTransitioningRef.current = false;
        }, 100);
      } else {
        // End of playlist: stop cleanly.
        setIsPlaying(false);
      }
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => {
      // Ignore pause events during track transitions (when track ends naturally)
      if (!isTransitioningRef.current) {
        setIsPlaying(false);
      }
    };
    // Ensure playback rate is applied after audio loads
    const handleLoadedMetadata = () => {
      audio.playbackRate = playbackRateRef.current / 100;
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [setCurrentTime, setDuration, setIsPlaying, nextTrack]);

  // Control playback
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch(() => {
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, setIsPlaying]);

  // Update audio source when track changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || tracks.length === 0) return;

    const currentTrack = tracks[currentTrackIndex];
    if (currentTrack) {
      const newSrc = `${BASE_URL}data/audio/${currentTrack.audioFile}`;
      if (currentSrcRef.current !== newSrc) {
        currentSrcRef.current = newSrc;
        audio.src = newSrc;
        audio.load();
        if (isPlayingRef.current) {
          audio.play().catch(() => setIsPlaying(false));
        }
      }
    }
  }, [currentTrackIndex, tracks, setIsPlaying]);

  // Scroll current track into view
  useEffect(() => {
    if (trackListRef.current) {
      const activeItem = trackListRef.current.querySelector(`.${styles.activeTrack}`);
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTrackIndex]);

  // Update playback rate when it changes. Preserve currentTime defensively:
  // some browsers (notably older iOS Safari) briefly reset currentTime when
  // playbackRate is assigned. Restoring it guarantees the track keeps playing
  // in place instead of jumping back to the start.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const savedTime = audio.currentTime;
    audio.playbackRate = playbackRate / 100;
    if (Number.isFinite(savedTime) && audio.currentTime !== savedTime) {
      audio.currentTime = savedTime;
    }
  }, [playbackRate]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft') {
        previousTrack();
      } else if (e.key === 'ArrowRight') {
        nextTrack();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, previousTrack, nextTrack]);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value);
      setCurrentTime(time);
      if (audioRef.current) {
        audioRef.current.currentTime = time;
      }
    },
    [setCurrentTime]
  );

  const handleSpeedDecrease = useCallback(() => {
    setPlaybackRate(Math.max(50, playbackRate - 5));
  }, [playbackRate, setPlaybackRate]);

  const handleSpeedIncrease = useCallback(() => {
    setPlaybackRate(Math.min(150, playbackRate + 5));
  }, [playbackRate, setPlaybackRate]);

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTrackDisplayName = (track: AudioTrack): string => {
    return `Ch ${track.chapterNumber}.${track.partNumber} - ${track.type === 'phrases' ? 'Phrases' : 'Dialogue'}`;
  };

  const currentTrack = tracks[currentTrackIndex];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <ArrowLeftIcon size={24} />
        </button>
        <h1 className={styles.title}>Audio Player</h1>
        <div className={styles.headerSpacer} />
      </header>

      <div className={styles.content}>
        {/* Now Playing */}
        <div className={styles.nowPlaying}>
          <div className={styles.trackInfo}>
            {currentTrack ? (
              <>
                <span className={styles.trackChapter}>
                  Chapter {currentTrack.chapterNumber}.{currentTrack.partNumber}
                </span>
                <span className={styles.trackType}>
                  {currentTrack.type === 'phrases' ? 'Phrases' : 'Dialogue'}
                </span>
              </>
            ) : (
              <span className={styles.trackChapter}>No track selected</span>
            )}
          </div>

          {/* Progress bar */}
          <div className={styles.progressContainer}>
            <span className={styles.time}>{formatTime(currentTime)}</span>
            <input
              type="range"
              className={styles.progressBar}
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              aria-label="Seek"
            />
            <span className={styles.time}>{formatTime(duration)}</span>
          </div>

          {/* Controls */}
          <div className={styles.controls}>
            <button
              className={styles.controlButton}
              onClick={previousTrack}
              disabled={currentTrackIndex === 0 && currentTime < 3}
              aria-label="Previous track"
            >
              <PreviousTrackIcon size={28} />
            </button>
            <button
              className={styles.playButton}
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <PauseFilledIcon size={32} /> : <PlayFilledIcon size={32} />}
            </button>
            <button
              className={styles.controlButton}
              onClick={nextTrack}
              disabled={currentTrackIndex >= tracks.length - 1}
              aria-label="Next track"
            >
              <NextTrackIcon size={28} />
            </button>
            <button
              className={`${styles.controlButton} ${repeat ? styles.controlButtonActive : ''}`}
              onClick={toggleRepeat}
              aria-label={repeat ? 'Turn off repeat' : 'Turn on repeat'}
              aria-pressed={repeat}
            >
              <RepeatIcon size={24} />
            </button>
          </div>

          {/* Speed Control */}
          <div className={styles.speedControl}>
            <button
              onClick={handleSpeedDecrease}
              className={styles.speedBtn}
              aria-label="Decrease speed"
              disabled={playbackRate <= 50}
            >
              -
            </button>
            <span className={styles.speedLabel}>{playbackRate}%</span>
            <input
              type="range"
              min="50"
              max="150"
              step="5"
              value={playbackRate}
              onChange={(e) => setPlaybackRate(Number(e.target.value))}
              className={styles.speedSlider}
              aria-label="Playback speed"
            />
            <button
              onClick={handleSpeedIncrease}
              className={styles.speedBtn}
              aria-label="Increase speed"
              disabled={playbackRate >= 150}
            >
              +
            </button>
          </div>
        </div>

        {/* Track list */}
        <div className={styles.trackList} ref={trackListRef}>
          <h2 className={styles.trackListTitle}>All Tracks ({tracks.length})</h2>
          {isLoading ? (
            <div className={styles.loading}>Loading tracks...</div>
          ) : tracks.length === 0 ? (
            <div className={styles.empty}>No audio tracks available</div>
          ) : (
            <ul className={styles.tracks}>
              {tracks.map((track, index) => (
                <li key={track.id}>
                  <button
                    className={`${styles.trackItem} ${index === currentTrackIndex ? styles.activeTrack : ''}`}
                    onClick={() => playTrack(index)}
                  >
                    <span className={styles.trackIndex}>{index + 1}</span>
                    <span className={styles.trackName}>{getTrackDisplayName(track)}</span>
                    {index === currentTrackIndex && isPlaying && (
                      <span className={styles.playingBars}>
                        <span />
                        <span />
                        <span />
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Hidden audio element */}
      <audio ref={audioRef} preload="metadata" />
    </div>
  );
};

export default AudioPlayer;
