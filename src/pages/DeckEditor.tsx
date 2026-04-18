import { FC, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDeckStore } from '@/store/deckStore';
import { Card, Deck } from '@/types';
import { saveUserDeck } from '@/services/userDeckDb';
import { syncDeckUpsert } from '@/services/sync/syncHooks';
import styles from './DeckEditor.module.css';

const SIDE_KEYS = ['side_a', 'side_b', 'side_c', 'side_d', 'side_e', 'side_f', 'side_g', 'side_h', 'side_i', 'side_j'] as const;
const SIDE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

const DeckEditor: FC = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { decks } = useDeckStore();

  const deck = useMemo(() => decks.find(d => d.id === deckId), [decks, deckId]);
  const [cards, setCards] = useState<Card[]>(deck?.content || []);

  // Track which sides this deck has
  const sideLabels = deck?.metadata?.side_labels || {};
  const availableSides = deck?.metadata?.available_sides || 2;

  // Debounced persist to IndexedDB
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistDeck = useCallback((updatedDeck: Deck) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const isLibrary = !updatedDeck.metadata.tags?.includes('user-created');
      saveUserDeck(updatedDeck, isLibrary).catch(() => {});
      syncDeckUpsert(updatedDeck);
    }, 500);
  }, []);
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const updateCard = useCallback((idx: number, field: string, value: string) => {
    setCards(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
    // Persist to deckStore + IndexedDB
    if (deckId) {
      useDeckStore.setState(state => ({
        decks: state.decks.map(d => {
          if (d.id !== deckId) return d;
          const newContent = [...d.content];
          newContent[idx] = { ...newContent[idx], [field]: value };
          const updated = { ...d, content: newContent, metadata: { ...d.metadata, card_count: newContent.length } };
          persistDeck(updated);
          return updated;
        }),
      }));
    }
  }, [deckId, persistDeck]);

  const addCard = useCallback(() => {
    const newCard: Card = {
      idx: cards.length,
      name: `Card ${cards.length + 1}`,
      side_a: '',
      side_b: '',
      level: 1,
    };
    const newCards = [...cards, newCard];
    setCards(newCards);
    if (deckId) {
      useDeckStore.setState(state => ({
        decks: state.decks.map(d => {
          if (d.id !== deckId) return d;
          const updated = { ...d, content: newCards, metadata: { ...d.metadata, card_count: newCards.length } };
          persistDeck(updated);
          return updated;
        }),
      }));
    }
  }, [cards, deckId, persistDeck]);

  const deleteCard = useCallback((idx: number) => {
    const newCards = cards
      .filter((_, i) => i !== idx)
      .map((card, i) => ({ ...card, idx: i, name: `Card ${i + 1}` }));
    setCards(newCards);
    if (deckId) {
      useDeckStore.setState(state => ({
        decks: state.decks.map(d => {
          if (d.id !== deckId) return d;
          const updated = { ...d, content: newCards, metadata: { ...d.metadata, card_count: newCards.length } };
          persistDeck(updated);
          return updated;
        }),
      }));
    }
  }, [cards, deckId, persistDeck]);

  if (!deck) {
    return (
      <div className={styles.container}>
        <p>Deck not found.</p>
        <button className={styles.backButton} onClick={() => navigate('/')} type="button">
          &larr; Home
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backButton} onClick={() => navigate(`/deck/${deckId}`)} type="button">
            &larr;
          </button>
          <h1 className={styles.title}>{deck.metadata.deck_name}</h1>
        </div>
        <span className={styles.cardCount}>{cards.length} cards</span>
      </div>

      {cards.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No cards yet</p>
          <p>Add your first card to get started.</p>
        </div>
      ) : (
        <div className={styles.cardList}>
          {cards.map((card, idx) => (
            <div key={idx} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardIndex}>#{idx + 1}</span>
                <button
                  className={styles.deleteButton}
                  onClick={() => deleteCard(idx)}
                  type="button"
                  aria-label={`Delete card ${idx + 1}`}
                >
                  Remove
                </button>
              </div>
              <div className={styles.cardFields}>
                {SIDE_KEYS.slice(0, availableSides).map((sideKey, sideIdx) => {
                  const labels = sideLabels as Record<string, string>;
                  const cardRecord = card as unknown as Record<string, string>;
                  return (
                    <div key={sideKey} className={styles.fieldRow}>
                      <span className={styles.fieldLabel}>
                        {labels[sideKey] || SIDE_LETTERS[sideIdx]}
                      </span>
                      <input
                        className={styles.fieldInput}
                        type="text"
                        value={cardRecord[sideKey] || ''}
                        onChange={e => updateCard(idx, sideKey, e.target.value)}
                        placeholder={labels[sideKey] || `Side ${SIDE_LETTERS[sideIdx]}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <button className={styles.addButton} onClick={addCard} type="button">
        + Add Card
      </button>
    </div>
  );
};

export default DeckEditor;
