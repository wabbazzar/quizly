import { FC, useState, useCallback, useRef } from 'react';
import { useDeckStore } from '@/store/deckStore';
import { Deck } from '@/types';
import { saveUserDeck } from '@/services/userDeckDb';
import styles from './DeckImportModal.module.css';

interface DeckImportModalProps {
  open: boolean;
  onClose: () => void;
  onImported?: (deckId: string) => void;
}

export const DeckImportModal: FC<DeckImportModalProps> = ({ open, onClose, onImported }) => {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const validateAndImport = useCallback((raw: string) => {
    setError('');
    try {
      const data = JSON.parse(raw);

      // Validate required structure
      if (!data.id || typeof data.id !== 'string') {
        throw new Error('Missing or invalid "id" field');
      }
      if (!data.metadata || typeof data.metadata !== 'object') {
        throw new Error('Missing "metadata" object');
      }
      if (!data.metadata.deck_name) {
        throw new Error('Missing "metadata.deck_name"');
      }
      if (!Array.isArray(data.content)) {
        throw new Error('Missing "content" array');
      }

      // Validate cards have required sides
      for (let i = 0; i < data.content.length; i++) {
        const card = data.content[i];
        if (!card.side_a && card.side_a !== '') {
          throw new Error(`Card ${i + 1}: missing "side_a"`);
        }
        if (!card.side_b && card.side_b !== '') {
          throw new Error(`Card ${i + 1}: missing "side_b"`);
        }
      }

      // Ensure each card has idx
      data.content = data.content.map((card: Record<string, unknown>, i: number) => ({
        ...card,
        idx: card.idx ?? i,
        name: card.name || `Card ${i + 1}`,
        level: card.level ?? 1,
      }));

      // Update card count
      data.metadata.card_count = data.content.length;

      // Check for duplicate ID
      const { decks } = useDeckStore.getState();
      if (decks.some(d => d.id === data.id)) {
        // Append suffix to avoid collision
        data.id = `${data.id}_${Date.now()}`;
      }

      // Add to store
      const importedDeck = data as Deck;
      useDeckStore.setState(state => ({
        decks: [...state.decks, importedDeck],
      }));
      saveUserDeck(importedDeck, false).catch(() => {});

      setJsonText('');
      onImported?.(data.id);
      onClose();
    } catch (e) {
      if (e instanceof SyntaxError) {
        setError('Invalid JSON format. Check your syntax.');
      } else {
        setError((e as Error).message);
      }
    }
  }, [onClose, onImported]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = () => {
      validateAndImport(reader.result as string);
      setImporting(false);
    };
    reader.onerror = () => {
      setError('Failed to read file');
      setImporting(false);
    };
    reader.readAsText(file);

    // Reset file input so same file can be re-selected
    e.target.value = '';
  }, [validateAndImport]);

  const handlePaste = useCallback(() => {
    if (!jsonText.trim()) {
      setError('Paste deck JSON first');
      return;
    }
    validateAndImport(jsonText);
  }, [jsonText, validateAndImport]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Import Deck</h2>
          <button className={styles.closeButton} onClick={onClose} type="button">
            &times;
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.fileSection}>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className={styles.fileInput}
              id="deck-file-input"
            />
            <button
              className={styles.fileButton}
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              type="button"
            >
              Choose JSON File
            </button>
          </div>

          <div className={styles.divider}>or paste JSON below</div>

          <textarea
            className={styles.textarea}
            value={jsonText}
            onChange={e => { setJsonText(e.target.value); setError(''); }}
            placeholder='{"id": "my-deck", "metadata": {...}, "content": [...]}'
            rows={8}
          />

          {error && <div className={styles.error}>{error}</div>}

          <button
            className={styles.importButton}
            onClick={handlePaste}
            disabled={!jsonText.trim() || importing}
            type="button"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
};
