import { FC, useCallback, useState, useRef, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import CopyIcon from '@/components/icons/CopyIcon';
import { PlayIcon, PauseIcon, SkipBackIcon, SkipForwardIcon, RestartIcon } from '@/components/icons/ModeIcons';
import { useTranscriptStore } from '@/store/transcriptStore';
import styles from './TranscriptModal.module.css';

export const TranscriptModal: FC = () => {
  const {
    isModalOpen,
    selectedTranscript,
    transcriptContent,
    isLoadingContent,
    error,
    closeModal,
  } = useTranscriptStore();

  const [copySuccess, setCopySuccess] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(100);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const audioFile = selectedTranscript?.audioFile;
  const audioUrl = audioFile ? `${import.meta.env.BASE_URL}data/audio/${audioFile}` : null;

  // Cleanup audio when modal closes
  useEffect(() => {
    if (!isModalOpen && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [isModalOpen]);

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [audioUrl]);

  // Update playback rate when slider changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate / 100;
    }
  }, [playbackRate]);

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleSkipBack = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
  }, []);

  const handleSkipForward = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10);
  }, [duration]);

  const handleRestart = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    if (!isPlaying) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = Number(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, []);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSpeedDecrease = useCallback(() => {
    setPlaybackRate(prev => Math.max(75, prev - 5));
  }, []);

  const handleSpeedIncrease = useCallback(() => {
    setPlaybackRate(prev => Math.min(100, prev + 5));
  }, []);

  const handleCopy = useCallback(async () => {
    if (!transcriptContent) return;

    try {
      await navigator.clipboard.writeText(transcriptContent);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = transcriptContent;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (fallbackErr) {
        console.error('Failed to copy text:', fallbackErr);
      }
    }
  }, [transcriptContent]);

  const modalTitle = selectedTranscript
    ? `${selectedTranscript.displayName} Transcript`
    : 'Transcript';

  return (
    <Modal
      isOpen={isModalOpen}
      onClose={closeModal}
      title={modalTitle}
      size="large"
      className={styles.transcriptModal}
    >
      <div className={styles.modalContent}>
        {audioUrl ? (
          <>
            <audio ref={audioRef} src={audioUrl} preload="metadata" />
            <div className={styles.audioPlayer}>
              <div className={styles.progressContainer}>
                <span className={styles.time}>{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className={styles.progressBar}
                  aria-label="Seek"
                />
                <span className={styles.time}>{formatTime(duration)}</span>
              </div>
              <div className={styles.controls}>
                <button
                  onClick={handleRestart}
                  className={styles.controlBtn}
                  aria-label="Restart"
                  disabled={isLoadingContent}
                >
                  <RestartIcon size={26} />
                </button>
                <button
                  onClick={handleSkipBack}
                  className={styles.skipBtn}
                  aria-label="Skip back 10 seconds"
                  disabled={isLoadingContent}
                >
                  <SkipBackIcon size={36} />
                </button>
                <button
                  onClick={handlePlayPause}
                  className={styles.playBtn}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  disabled={isLoadingContent}
                >
                  {isPlaying ? <PauseIcon size={32} /> : <PlayIcon size={32} />}
                </button>
                <button
                  onClick={handleSkipForward}
                  className={styles.skipBtn}
                  aria-label="Skip forward 10 seconds"
                  disabled={isLoadingContent}
                >
                  <SkipForwardIcon size={36} />
                </button>
                <div className={styles.copyContainer}>
                  {copySuccess && <span className={styles.copiedText}>Copied!</span>}
                  <button
                    onClick={handleCopy}
                    className={styles.copyBtn}
                    aria-label={copySuccess ? 'Copied!' : 'Copy transcript'}
                    title={copySuccess ? 'Copied!' : 'Copy'}
                    disabled={!transcriptContent || isLoadingContent}
                  >
                    <CopyIcon size={22} />
                  </button>
                </div>
              </div>
              <div className={styles.speedControl}>
                <button
                  onClick={handleSpeedDecrease}
                  className={styles.speedBtn}
                  aria-label="Decrease speed"
                  disabled={playbackRate <= 75}
                >
                  -
                </button>
                <span className={styles.speedLabel}>{playbackRate}%</span>
                <input
                  type="range"
                  min="75"
                  max="100"
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
                  disabled={playbackRate >= 100}
                >
                  +
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className={styles.textToolbar}>
            <div className={styles.copyContainer}>
              {copySuccess && <span className={styles.copiedText}>Copied!</span>}
              <button
                onClick={handleCopy}
                className={styles.copyBtn}
                aria-label={copySuccess ? 'Copied!' : 'Copy transcript'}
                title={copySuccess ? 'Copied!' : 'Copy'}
                disabled={!transcriptContent || isLoadingContent}
              >
                <CopyIcon size={22} />
              </button>
            </div>
          </div>
        )}

        <div className={styles.contentContainer}>
          {isLoadingContent ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <span>Loading transcript...</span>
            </div>
          ) : error ? (
            <div className={styles.error}>
              <p>Failed to load transcript content.</p>
              <p className={styles.errorDetail}>{error}</p>
            </div>
          ) : transcriptContent ? (
            <pre className={styles.transcriptText}>{transcriptContent}</pre>
          ) : (
            <div className={styles.empty}>No content available.</div>
          )}
        </div>
      </div>
    </Modal>
  );
};
