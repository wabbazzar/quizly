import { FC, useState, useCallback, useEffect, useRef } from 'react';

interface SpeechButtonProps {
  deckId: string;
  cardIdx: number;
  side: string; // 'a', 'b', 'c', etc.
  size?: number;
  className?: string;
}

/**
 * Speaker button that plays per-card audio from public/data/audio/words/.
 * Only renders if the MP3 file exists.
 * Naming convention: {deckId}_card{idx}_side_{side}.mp3
 */
export const SpeechButton: FC<SpeechButtonProps> = ({
  deckId,
  cardIdx,
  side,
  size = 20,
  className,
}) => {
  const [available, setAvailable] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const audioPath = `${import.meta.env.BASE_URL}data/audio/words/${deckId}_card${cardIdx}_side_${side}.mp3`;

  // Check if MP3 exists via HEAD request (cached)
  useEffect(() => {
    let cancelled = false;
    fetch(audioPath, { method: 'HEAD' })
      .then(res => {
        if (!cancelled) setAvailable(res.ok);
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });
    return () => { cancelled = true; };
  }, [audioPath]);

  const handlePlay = useCallback(() => {
    if (playing && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
      return;
    }

    const audio = new Audio(audioPath);
    audioRef.current = audio;
    audio.onended = () => setPlaying(false);
    audio.onerror = () => setPlaying(false);
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [audioPath, playing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (!available) return null;

  return (
    <button
      onPointerDown={(e) => { e.stopPropagation(); }}
      onMouseDown={(e) => { e.stopPropagation(); }}
      onTouchStart={(e) => { e.stopPropagation(); }}
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); handlePlay(); }}
      className={className}
      type="button"
      aria-label="Play pronunciation"
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '8px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: playing ? 'var(--primary-main)' : 'var(--text-tertiary)',
        transition: 'color 0.15s',
        flexShrink: 0,
        position: 'relative',
        zIndex: 10,
        minWidth: '44px',
        minHeight: '44px',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        {playing ? (
          <>
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </>
        ) : (
          <>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </>
        )}
      </svg>
    </button>
  );
};
