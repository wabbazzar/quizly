import { FC, useEffect } from 'react';
import { useTranscriptStore } from '@/store/transcriptStore';
import { Button } from '@/components/ui/Button';
import styles from './TranscriptPicker.module.css';

interface Props {
  deckId: string;
}

export const TranscriptPicker: FC<Props> = ({ deckId }) => {
  const {
    availableTranscripts,
    isLoading,
    loadTranscriptsForDeck,
    selectTranscript,
  } = useTranscriptStore();

  useEffect(() => {
    loadTranscriptsForDeck(deckId);
  }, [deckId, loadTranscriptsForDeck]);

  // Don't render anything while loading initially
  if (isLoading) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>Transcripts</h3>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  // Don't show section if no transcripts available for this deck
  if (availableTranscripts.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Transcripts</h3>
      <p className={styles.subtitle}>Raw text for external readers</p>
      <div className={styles.transcriptList}>
        {availableTranscripts.map((transcript) => (
          <Button
            key={transcript.id}
            variant="secondary"
            className={styles.transcriptButton}
            onClick={() => selectTranscript(transcript)}
          >
            <div className={styles.transcriptContent}>
              <span className={styles.transcriptName}>
                {transcript.displayName}
              </span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={styles.icon}
                aria-hidden="true"
              >
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15,3 21,3 21,9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
};
