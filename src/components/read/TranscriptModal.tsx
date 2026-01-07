import { FC, useCallback, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import CopyIcon from '@/components/icons/CopyIcon';
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
        <div className={styles.copyHeader}>
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
