import { Deck } from '@/types';

/**
 * Export a deck as a JSON file download.
 */
export function exportDeckAsJson(deck: Deck): void {
  const json = JSON.stringify(deck, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${deck.metadata.deck_name.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
