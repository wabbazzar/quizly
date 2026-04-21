import { FC, memo } from 'react';
import { DownloadIcon, DownloadedIcon } from '@/components/icons/OfflineIcons';
import { useOfflineDownload } from '@/hooks/useOfflineDownload';
import { Deck } from '@/types';
import styles from './OfflineButton.module.css';

interface OfflineButtonProps {
  deck: Deck;
}

export const OfflineButton: FC<OfflineButtonProps> = memo(({ deck }) => {
  const { isDownloaded, isBusy, progress, download, remove, cancel } = useOfflineDownload(deck);

  if (isBusy && progress) {
    const pct = progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

    return (
      <button
        className={styles.button}
        onClick={cancel}
        aria-label="Cancel download"
        title="Cancel download"
      >
        <svg
          width={20}
          height={20}
          viewBox="0 0 36 36"
          className={styles.progressRing}
        >
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke="var(--border-color)"
            strokeWidth="3"
          />
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke="var(--primary-main)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 15}`}
            strokeDashoffset={`${2 * Math.PI * 15 * (1 - pct / 100)}`}
            transform="rotate(-90 18 18)"
            className={styles.progressArc}
          />
          <text
            x="18"
            y="19"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--text-secondary)"
            fontSize="10"
            fontWeight="600"
          >
            {pct}
          </text>
        </svg>
      </button>
    );
  }

  if (isDownloaded) {
    return (
      <button
        className={`${styles.button} ${styles.downloaded}`}
        onClick={remove}
        aria-label="Remove offline data"
        title="Remove offline data"
      >
        <DownloadedIcon size={20} color="var(--semantic-success)" />
      </button>
    );
  }

  return (
    <button
      className={styles.button}
      onClick={download}
      aria-label="Download for offline"
      title="Download for offline"
    >
      <DownloadIcon size={20} />
    </button>
  );
});

OfflineButton.displayName = 'OfflineButton';
