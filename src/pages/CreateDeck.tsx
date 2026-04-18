import { FC, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeckStore } from '@/store/deckStore';
import { Deck, DeckFamily } from '@/types';
import { loadFamilies } from '@/utils/familyLoader';
import { saveUserDeck } from '@/services/userDeckDb';
import { syncDeckUpsert } from '@/services/sync/syncHooks';
import styles from './CreateDeck.module.css';

const SIDE_KEYS = ['side_a', 'side_b', 'side_c', 'side_d', 'side_e', 'side_f', 'side_g', 'side_h', 'side_i', 'side_j'];
const SIDE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const MAX_SIDES = 10;
const MIN_SIDES = 2;

const CreateDeck: FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [familyId, setFamilyId] = useState('');
  const [newFamilyName, setNewFamilyName] = useState('');
  const [families, setFamilies] = useState<DeckFamily[]>([]);

  useEffect(() => {
    loadFamilies().then(setFamilies);
  }, []);
  const [sides, setSides] = useState<{ key: string; label: string }[]>([
    { key: 'side_a', label: 'Front' },
    { key: 'side_b', label: 'Back' },
  ]);
  const [error, setError] = useState('');

  const addSide = useCallback(() => {
    if (sides.length >= MAX_SIDES) return;
    const nextIdx = sides.length;
    setSides(prev => [...prev, {
      key: SIDE_KEYS[nextIdx],
      label: '',
    }]);
  }, [sides.length]);

  const removeSide = useCallback((idx: number) => {
    if (sides.length <= MIN_SIDES) return;
    setSides(prev => prev.filter((_, i) => i !== idx));
  }, [sides.length]);

  const updateSideLabel = useCallback((idx: number, label: string) => {
    setSides(prev => prev.map((s, i) => i === idx ? { ...s, label } : s));
  }, []);

  const handleCreate = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Deck name is required');
      return;
    }
    if (trimmedName.length > 100) {
      setError('Deck name must be under 100 characters');
      return;
    }

    const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const sideLabels: Record<string, string> = {};
    sides.forEach((side, idx) => {
      sideLabels[SIDE_KEYS[idx]] = side.label.trim() || `Side ${SIDE_LETTERS[idx]}`;
    });

    // Resolve family
    let resolvedFamilyId = familyId;
    if (familyId === '__new__' && newFamilyName.trim()) {
      resolvedFamilyId = newFamilyName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    }

    const newDeck: Deck = {
      id,
      metadata: {
        deck_name: trimmedName,
        description: description.trim(),
        category: 'custom',
        family_id: resolvedFamilyId || undefined,
        available_levels: [1],
        available_sides: sides.length,
        side_labels: sideLabels,
        card_count: 0,
        difficulty: 'beginner',
        tags: ['user-created'],
        version: '1.0.0',
        created_date: now,
        last_updated: now,
      },
      content: [],
    };

    // Add to in-memory store + persist to IndexedDB
    useDeckStore.setState(state => ({
      decks: [...state.decks, newDeck],
    }));
    saveUserDeck(newDeck, false).catch(() => {});
    syncDeckUpsert(newDeck);

    navigate(`/deck/${id}/edit`);
  }, [name, description, sides, navigate]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/')} type="button">
          &larr; Back
        </button>
        <h1 className={styles.title}>New Deck</h1>
      </div>

      <div className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="deck-name">Deck Name *</label>
          <input
            id="deck-name"
            className={styles.input}
            type="text"
            placeholder="e.g. Spanish Vocabulary"
            value={name}
            onChange={e => { setName(e.target.value); setError(''); }}
            maxLength={100}
            autoFocus
          />
          {error && <span className={styles.error}>{error}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="deck-desc">Description</label>
          <textarea
            id="deck-desc"
            className={styles.textarea}
            placeholder="What is this deck about?"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="deck-family">Group (Family)</label>
          <span className={styles.hint}>Organize decks into families for easy browsing.</span>
          <select
            id="deck-family"
            className={styles.select}
            value={familyId}
            onChange={e => setFamilyId(e.target.value)}
          >
            <option value="">No group</option>
            {families.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
            <option value="__new__">+ New group...</option>
          </select>
          {familyId === '__new__' && (
            <input
              className={styles.input}
              type="text"
              placeholder="Group name"
              value={newFamilyName}
              onChange={e => setNewFamilyName(e.target.value)}
              style={{ marginTop: 'var(--space-2)' }}
            />
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Card Sides</label>
          <span className={styles.hint}>
            Every card has at least two sides. Add more for extra info like pronunciation, examples, or notes.
          </span>

          <div className={styles.sideList}>
            {sides.map((side, idx) => (
              <div key={side.key} className={styles.sideRow}>
                <span className={styles.sideLetter}>{SIDE_LETTERS[idx]}</span>
                <input
                  className={styles.sideLabelInput}
                  type="text"
                  placeholder={idx === 0 ? 'Front' : idx === 1 ? 'Back' : `Side ${SIDE_LETTERS[idx]}`}
                  value={side.label}
                  onChange={e => updateSideLabel(idx, e.target.value)}
                />
                {idx >= MIN_SIDES && (
                  <button
                    className={styles.removeSideButton}
                    onClick={() => removeSide(idx)}
                    type="button"
                    aria-label={`Remove side ${SIDE_LETTERS[idx]}`}
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>

          {sides.length < MAX_SIDES && (
            <button
              className={styles.addSideButton}
              onClick={addSide}
              type="button"
            >
              + Add Side
            </button>
          )}
        </div>

        <div className={styles.actions}>
          <button
            className={styles.createButton}
            onClick={handleCreate}
            disabled={!name.trim()}
            type="button"
          >
            Create Deck
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateDeck;
