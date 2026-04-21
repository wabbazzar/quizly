import { useState, useCallback, useRef, useEffect } from 'react';
import {
  isDeckDownloaded,
  downloadDeckForOffline,
  removeDeckOfflineData,
  DownloadProgress,
} from '@/services/offlineStorage';
import { Deck } from '@/types';

export interface OfflineDownloadState {
  /** Whether this deck has been fully downloaded for offline use. */
  isDownloaded: boolean;
  /** True while a download or removal is in progress. */
  isBusy: boolean;
  /** Progress info during download; null when idle. */
  progress: DownloadProgress | null;
  /** Start downloading this deck for offline use. */
  download: () => void;
  /** Remove this deck's offline data. */
  remove: () => void;
  /** Cancel an in-progress download. */
  cancel: () => void;
}

/**
 * Hook to manage offline download state for a single deck.
 * Reads/writes the Cache API and localStorage tracking.
 */
export function useOfflineDownload(deck: Deck | null): OfflineDownloadState {
  const deckId = deck?.id ?? '';
  const [isDownloaded, setIsDownloaded] = useState(() => isDeckDownloaded(deckId));
  const [isBusy, setIsBusy] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Re-check download status when deckId changes
  useEffect(() => {
    setIsDownloaded(isDeckDownloaded(deckId));
    setProgress(null);
    setIsBusy(false);
  }, [deckId]);

  const download = useCallback(() => {
    if (!deck || isBusy) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setIsBusy(true);
    setProgress({ current: 0, total: 0, phase: 'json' });

    // Determine which sides have content by checking the first card
    const sideLetters: string[] = [];
    if (deck.content.length > 0) {
      const sample = deck.content[0];
      for (const letter of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) {
        const key = `side_${letter}` as keyof typeof sample;
        if (sample[key]) sideLetters.push(letter);
      }
    }

    downloadDeckForOffline(
      deck.id,
      deck.content.length,
      sideLetters,
      (p) => setProgress(p),
      controller.signal
    )
      .then(() => {
        setIsDownloaded(true);
        setProgress(null);
        setIsBusy(false);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // Cancelled by user
        }
        setProgress(null);
        setIsBusy(false);
      });
  }, [deck, isBusy]);

  const remove = useCallback(() => {
    if (!deckId || isBusy) return;
    setIsBusy(true);
    removeDeckOfflineData(deckId)
      .then(() => {
        setIsDownloaded(false);
        setIsBusy(false);
      })
      .catch(() => {
        setIsBusy(false);
      });
  }, [deckId, isBusy]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  return { isDownloaded, isBusy, progress, download, remove, cancel };
}
