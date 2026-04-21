/**
 * Offline Storage Service
 *
 * Pre-caches deck JSON and audio files into the Cache API so they are
 * available offline via the service worker. Uses the same cache names
 * as the workbox runtime caching config (audio-cache, deck-data-cache)
 * so manually cached entries and SW-cached entries coexist seamlessly.
 */

const AUDIO_CACHE = 'audio-cache';
const DECK_DATA_CACHE = 'deck-data-cache';
const DOWNLOADED_DECKS_KEY = 'quizly_offline_decks';

export interface DownloadProgress {
  current: number;
  total: number;
  phase: 'json' | 'audio';
}

export type ProgressCallback = (progress: DownloadProgress) => void;

/** Which deck IDs the user has explicitly downloaded for offline use. */
export function getDownloadedDeckIds(): string[] {
  try {
    const raw = localStorage.getItem(DOWNLOADED_DECKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setDownloadedDeckIds(ids: string[]): void {
  localStorage.setItem(DOWNLOADED_DECKS_KEY, JSON.stringify(ids));
}

export function isDeckDownloaded(deckId: string): boolean {
  return getDownloadedDeckIds().includes(deckId);
}

/**
 * Collect all URLs that need to be cached for a given deck.
 * Returns { jsonUrls, audioUrls }.
 */
function getDeckUrls(
  deckId: string,
  cardCount: number,
  sides: string[]
): { jsonUrls: string[]; audioUrls: string[] } {
  const base = import.meta.env.BASE_URL;

  const jsonUrls = [`${base}data/decks/${deckId}.json`];

  const audioUrls: string[] = [];

  // Word-level audio: {deckId}_card{idx}_side_{side}.mp3
  for (let i = 0; i < cardCount; i++) {
    for (const side of sides) {
      audioUrls.push(`${base}data/audio/words/${deckId}_card${i}_side_${side}.mp3`);
    }
  }

  // Dialogue/phrases audio (may or may not exist for this deck)
  audioUrls.push(`${base}data/audio/${deckId}_dialogue.mp3`);
  audioUrls.push(`${base}data/audio/${deckId}_phrases.mp3`);

  return { jsonUrls, audioUrls };
}

/**
 * Fetch a URL and put it in the named cache. Silently skips 404s (not all
 * audio files exist for every card/side combo).
 */
async function cacheUrl(cacheName: string, url: string): Promise<boolean> {
  try {
    const cache = await caches.open(cacheName);
    const response = await fetch(url);
    if (!response.ok) return false;
    await cache.put(url, response);
    return true;
  } catch {
    return false;
  }
}

/**
 * Download all assets for a deck into the Cache API.
 *
 * @param deckId     Deck identifier (e.g. "chinese_chpt5_1")
 * @param cardCount  Number of cards in the deck
 * @param sides      Which side letters have content (e.g. ["a","b","c"])
 * @param onProgress Optional progress callback
 * @param signal     Optional AbortSignal to cancel the download
 */
export async function downloadDeckForOffline(
  deckId: string,
  cardCount: number,
  sides: string[],
  onProgress?: ProgressCallback,
  signal?: AbortSignal
): Promise<void> {
  const { jsonUrls, audioUrls } = getDeckUrls(deckId, cardCount, sides);
  const totalFiles = jsonUrls.length + audioUrls.length;
  let completed = 0;

  // Phase 1: cache deck JSON
  for (const url of jsonUrls) {
    if (signal?.aborted) throw new DOMException('Download cancelled', 'AbortError');
    await cacheUrl(DECK_DATA_CACHE, url);
    completed++;
    onProgress?.({ current: completed, total: totalFiles, phase: 'json' });
  }

  // Phase 2: cache audio files (batch in groups of 6 for parallelism)
  const BATCH_SIZE = 6;
  for (let i = 0; i < audioUrls.length; i += BATCH_SIZE) {
    if (signal?.aborted) throw new DOMException('Download cancelled', 'AbortError');
    const batch = audioUrls.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(url => cacheUrl(AUDIO_CACHE, url)));
    completed += batch.length;
    onProgress?.({ current: completed, total: totalFiles, phase: 'audio' });
  }

  // Mark as downloaded
  const ids = getDownloadedDeckIds();
  if (!ids.includes(deckId)) {
    ids.push(deckId);
    setDownloadedDeckIds(ids);
  }
}

/**
 * Remove all cached assets for a deck.
 */
export async function removeDeckOfflineData(deckId: string): Promise<void> {
  // We need to figure out which URLs belong to this deck.
  // Scan both caches and delete matching entries.
  const prefix = import.meta.env.BASE_URL;

  const audioCacheHandle = await caches.open(AUDIO_CACHE);
  const audioKeys = await audioCacheHandle.keys();
  for (const req of audioKeys) {
    const url = new URL(req.url);
    if (
      url.pathname.includes(`/${deckId}_card`) ||
      url.pathname.includes(`/${deckId}_dialogue`) ||
      url.pathname.includes(`/${deckId}_phrases`)
    ) {
      await audioCacheHandle.delete(req);
    }
  }

  const jsonCacheHandle = await caches.open(DECK_DATA_CACHE);
  const jsonKeys = await jsonCacheHandle.keys();
  for (const req of jsonKeys) {
    if (req.url.includes(`${prefix}data/decks/${deckId}.json`)) {
      await jsonCacheHandle.delete(req);
    }
  }

  // Remove from tracking
  const ids = getDownloadedDeckIds().filter(id => id !== deckId);
  setDownloadedDeckIds(ids);
}

/**
 * Estimate total storage used by offline deck caches (in bytes).
 * Uses Cache API + StorageManager estimate when available.
 */
export async function estimateOfflineStorage(): Promise<{
  totalBytes: number;
  perDeck: Record<string, number>;
}> {
  const perDeck: Record<string, number> = {};
  const downloadedIds = getDownloadedDeckIds();

  // Initialize all downloaded decks
  for (const id of downloadedIds) {
    perDeck[id] = 0;
  }

  // Count audio cache sizes per deck
  try {
    const audioCache = await caches.open(AUDIO_CACHE);
    const audioKeys = await audioCache.keys();
    for (const req of audioKeys) {
      const resp = await audioCache.match(req);
      if (!resp) continue;
      const size = parseInt(resp.headers.get('content-length') || '0', 10);
      // Estimate from blob if content-length missing
      const actualSize = size || (await resp.clone().blob()).size;

      // Match to a deck
      const url = new URL(req.url);
      for (const deckId of downloadedIds) {
        if (
          url.pathname.includes(`/${deckId}_card`) ||
          url.pathname.includes(`/${deckId}_dialogue`) ||
          url.pathname.includes(`/${deckId}_phrases`)
        ) {
          perDeck[deckId] = (perDeck[deckId] || 0) + actualSize;
          break;
        }
      }
    }
  } catch {
    // Cache API may not be available
  }

  const totalBytes = Object.values(perDeck).reduce((sum, v) => sum + v, 0);
  return { totalBytes, perDeck };
}

/**
 * Format bytes to human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
