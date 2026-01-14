import { FC, useCallback, useState, useRef, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import CopyIcon from '@/components/icons/CopyIcon';
import { PlayIcon, PauseIcon } from '@/components/icons/ModeIcons';
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const audioFile = selectedTranscript?.audioFile;
  const audioUrl = audioFile ? `${import.meta.env.BASE_URL}data/audio/${audioFile}` : null;

  // Cleanup audio when modal closes
  useEffect(() => {
    if (!isModalOpen && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isModalOpen]);

  // Handle audio ended
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
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
        {audioUrl && (
          <audio ref={audioRef} src={audioUrl} preload="metadata" />
        )}
        <div className={styles.headerActions}>
          {audioUrl && (
            <div className={styles.audioControls}>
              <Button
                variant="secondary"
                size="small"
                onClick={handlePlayPause}
                className={styles.playButton}
                aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
                disabled={isLoadingContent}
              >
                {isPlaying ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
                <span>{isPlaying ? 'Pause' : 'Listen'}</span>
              </Button>
              <div className={styles.speedControl}>
                <label htmlFor="speed-slider" className={styles.speedLabel}>
                  Speed: {playbackRate}%
                </label>
                <input
                  id="speed-slider"
                  type="range"
                  min="80"
                  max="100"
                  step="5"
                  value={playbackRate}
                  onChange={(e) => setPlaybackRate(Number(e.target.value))}
                  className={styles.speedSlider}
                  aria-label="Playback speed"
                />
              </div>
            </div>
          )}
          <Button
            variant="secondary"
            size="small"
            onClick={handleCopy}
            className={styles.copyButton}
            aria-label="Copy transcript to clipboard"
            disabled={!transcriptContent || isLoadingContent}
          >
            <CopyIcon size={18} />
            <span>{copySuccess ? 'Copied!' : 'Copy All'}</span>
          </Button>
        </div>

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
