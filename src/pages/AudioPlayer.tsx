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
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setPlaybackRate,
    playTrack,
    nextTrack,
    previousTrack,
    togglePlay,
  } = useAudioPlayerStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const trackListRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    const handleEnded = () => nextTrack();
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
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
      if (audio.src !== newSrc) {
        audio.src = newSrc;
        audio.load();
        if (isPlaying) {
          audio.play().catch(() => setIsPlaying(false));
        }
      }
    }
  }, [currentTrackIndex, tracks, isPlaying, setIsPlaying]);

  // Scroll current track into view
  useEffect(() => {
    if (trackListRef.current) {
      const activeItem = trackListRef.current.querySelector(`.${styles.activeTrack}`);
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTrackIndex]);

  // Update playback rate when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate / 100;
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
