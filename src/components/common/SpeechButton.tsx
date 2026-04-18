import { FC, useState, useCallback, useEffect, useRef } from 'react';

interface SpeechButtonProps {
  deckId: string;
  cardIdx: number;
  side: string; // 'a', 'b', 'c', etc.
  size?: number;
  className?: string;
}

// Cache availability checks across renders and component instances
const availabilityCache = new Map<string, boolean>();

/**
 * Speaker button that plays per-card audio from public/data/audio/words/.
 * Only renders if the MP3 file actually exists (verified by content-type).
 * Uses <audio> element for iOS Safari compatibility (same pattern as AudioPlayer.tsx).
 * Naming convention: {deckId}_card{idx}_side_{side}.mp3
 */
export const SpeechButton: FC<SpeechButtonProps> = ({
  deckId,
  cardIdx,
  side,
  size = 20,
  className,
}) => {
  const [available, setAvailable] = useState<boolean | null>(() =>
    availabilityCache.get(`${deckId}_card${cardIdx}_side_${side}`) ?? null
  );
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const audioPath = `${import.meta.env.BASE_URL}data/audio/words/${deckId}_card${cardIdx}_side_${side}.mp3`;
  const cacheKey = `${deckId}_card${cardIdx}_side_${side}`;

  // Check if MP3 actually exists (content-type check, not just HTTP status,
  // because Vite SPA fallback returns 200 + text/html for missing files)
  useEffect(() => {
    if (availabilityCache.has(cacheKey)) {
      setAvailable(availabilityCache.get(cacheKey)!);
      return;
    }

    let cancelled = false;
    fetch(audioPath, { method: 'HEAD' })
      .then(res => {
        if (cancelled) return;
        const ct = res.headers.get('content-type') || '';
        const isAudio = res.ok && (ct.includes('audio') || ct.includes('octet-stream'));
        availabilityCache.set(cacheKey, isAudio);
        setAvailable(isAudio);
      })
      .catch(() => {
        if (!cancelled) {
          availabilityCache.set(cacheKey, false);
          setAvailable(false);
        }
      });
    return () => { cancelled = true; };
  }, [audioPath, cacheKey]);

  const handlePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      audio.currentTime = 0;
      setPlaying(false);
      return;
    }

    audio.currentTime = 0;
    audio.play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  }, [playing]);

  if (!available) return null;

  return (
    <>
      {/* Hidden audio element for iOS Safari compatibility */}
      <audio
        ref={audioRef}
        src={audioPath}
        preload="auto"
        onEnded={() => setPlaying(false)}
        onError={() => setPlaying(false)}
      />
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
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
    </>
  );
};
