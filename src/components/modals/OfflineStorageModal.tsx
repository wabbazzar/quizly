import { FC, memo, useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Deck } from '@/types';
import { DownloadedIcon } from '@/components/icons/OfflineIcons';
import {
  getDownloadedDeckIds,
  removeDeckOfflineData,
  estimateOfflineStorage,
  formatBytes,
} from '@/services/offlineStorage';
import styles from './OfflineStorageModal.module.css';

interface OfflineStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  decks: Deck[];
}

export const OfflineStorageModal: FC<OfflineStorageModalProps> = memo(({
  isOpen,
  onClose,
  decks,
}) => {
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);
  const [perDeckBytes, setPerDeckBytes] = useState<Record<string, number>>({});
  const [totalBytes, setTotalBytes] = useState(0);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const ids = getDownloadedDeckIds();
    setDownloadedIds(ids);
    if (ids.length > 0) {
      const storage = await estimateOfflineStorage();
      setPerDeckBytes(storage.perDeck);
      setTotalBytes(storage.totalBytes);
    } else {
      setPerDeckBytes({});
      setTotalBytes(0);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      refresh();
    }
  }, [isOpen, refresh]);

  const handleRemove = useCallback(async (deckId: string) => {
    setRemovingId(deckId);
    await removeDeckOfflineData(deckId);
    await refresh();
    setRemovingId(null);
  }, [refresh]);

  const handleRemoveAll = useCallback(async () => {
    setRemovingId('__all__');
    for (const id of downloadedIds) {
      await removeDeckOfflineData(id);
    }
    await refresh();
    setRemovingId(null);
  }, [downloadedIds, refresh]);

  const downloadedDecks = decks.filter(d => downloadedIds.includes(d.id));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Offline Storage"
      size="medium"
    >
      <div className={styles.container}>
        {/* Storage summary */}
        <div className={styles.summary}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Downloaded decks</span>
            <span className={styles.summaryValue}>{downloadedIds.length}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Storage used</span>
            <span className={styles.summaryValue}>{formatBytes(totalBytes)}</span>
          </div>
        </div>

        {downloadedDecks.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyText}>No decks downloaded for offline use.</p>
            <p className={styles.emptyHint}>
              Open a deck and tap the download button to make it available offline.
            </p>
          </div>
        ) : (
          <>
            <div className={styles.deckList}>
              {downloadedDecks.map(deck => (
                <div key={deck.id} className={styles.deckRow}>
                  <div className={styles.deckInfo}>
                    <DownloadedIcon size={16} color="var(--semantic-success)" />
                    <span className={styles.deckName}>
                      {deck.metadata.abbreviated_title || deck.metadata.deck_name}
                    </span>
                    <span className={styles.deckSize}>
                      {formatBytes(perDeckBytes[deck.id] || 0)}
                    </span>
                  </div>
                  <button
                    className={styles.removeButton}
                    onClick={() => handleRemove(deck.id)}
                    disabled={removingId !== null}
                    type="button"
                  >
                    {removingId === deck.id ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>

            {downloadedDecks.length > 1 && (
              <button
                className={styles.removeAllButton}
                onClick={handleRemoveAll}
                disabled={removingId !== null}
                type="button"
              >
                {removingId === '__all__' ? 'Removing all...' : 'Remove all offline data'}
              </button>
            )}
          </>
        )}
      </div>
    </Modal>
  );
});

OfflineStorageModal.displayName = 'OfflineStorageModal';
