import { FC, memo, useMemo, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Deck, DeckFamily } from '@/types';
import { useDeckVisibilityStore } from '@/store/deckVisibilityStore';
import styles from './DeckVisibilityModal.module.css';

interface DeckVisibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  decks: Deck[];
}

interface FamilyGroup {
  family: DeckFamily | null;
  decks: Deck[];
}

const OTHER_FAMILY: DeckFamily = {
  id: '__other__',
  name: 'Other',
  description: 'Uncategorized decks',
  color: '#6b7280',
  sortOrder: 9999,
};

const ToggleSwitch: FC<{
  checked: boolean;
  onChange: () => void;
  label: string;
}> = memo(({ checked, onChange, label }) => (
  <label className={styles.toggle}>
    <input
      type="checkbox"
      className={styles.toggleInput}
      checked={checked}
      onChange={onChange}
      aria-label={label}
    />
    <span className={styles.toggleSlider} />
  </label>
));

ToggleSwitch.displayName = 'ToggleSwitch';

export const DeckVisibilityModal: FC<DeckVisibilityModalProps> = memo(({
  isOpen,
  onClose,
  decks,
}) => {
  const {
    hiddenDeckIds,
    families,
    toggleDeckVisibility,
    hideAllInFamily,
    showAllInFamily,
  } = useDeckVisibilityStore();

  const familyGroups = useMemo((): FamilyGroup[] => {
    const groupMap = new Map<string, Deck[]>();

    decks.forEach(deck => {
      const familyId = deck.metadata.family_id || '__other__';
      const existing = groupMap.get(familyId) || [];
      existing.push(deck);
      groupMap.set(familyId, existing);
    });

    const groups: FamilyGroup[] = [];

    // Add families in sort order
    families.forEach(family => {
      const familyDecks = groupMap.get(family.id);
      if (familyDecks && familyDecks.length > 0) {
        groups.push({ family, decks: familyDecks });
        groupMap.delete(family.id);
      }
    });

    // Add "Other" group for decks without a known family
    const otherDecks = groupMap.get('__other__');
    if (otherDecks && otherDecks.length > 0) {
      groups.push({ family: OTHER_FAMILY, decks: otherDecks });
    }

    return groups;
  }, [decks, families]);

  const handleToggleAll = useCallback(
    (familyId: string, familyDeckIds: string[], allVisible: boolean) => {
      if (allVisible) {
        hideAllInFamily(familyId, familyDeckIds);
      } else {
        showAllInFamily(familyId, familyDeckIds);
      }
    },
    [hideAllInFamily, showAllInFamily]
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Decks" size="large">
      {familyGroups.map(group => {
        const family = group.family || OTHER_FAMILY;
        const familyDeckIds = group.decks.map(d => d.id);
        const visibleCount = group.decks.filter(d => !hiddenDeckIds.includes(d.id)).length;
        const allVisible = visibleCount === group.decks.length;

        return (
          <div key={family.id} className={styles.familySection}>
            <div
              className={styles.familyHeader}
              style={{ borderLeftColor: family.color }}
            >
              <div className={styles.familyInfo}>
                <h3 className={styles.familyName}>{family.name}</h3>
                <span className={styles.familyCount}>
                  {visibleCount}/{group.decks.length} visible
                </span>
              </div>
              <button
                className={styles.toggleAll}
                onClick={() => handleToggleAll(family.id, familyDeckIds, allVisible)}
              >
                {allVisible ? 'Hide all' : 'Show all'}
              </button>
            </div>

            <ul className={styles.deckList}>
              {group.decks.map(deck => {
                const isVisible = !hiddenDeckIds.includes(deck.id);
                return (
                  <li key={deck.id} className={styles.deckRow}>
                    <div className={styles.deckInfo}>
                      <span className={styles.deckTitle}>
                        {deck.metadata.abbreviated_title || deck.metadata.deck_name}
                      </span>
                      {deck.metadata.deck_subtitle && (
                        <span className={styles.deckSubtitle}>
                          {deck.metadata.deck_subtitle}
                        </span>
                      )}
                    </div>
                    <ToggleSwitch
                      checked={isVisible}
                      onChange={() => toggleDeckVisibility(deck.id)}
                      label={`Toggle visibility for ${deck.metadata.deck_name}`}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </Modal>
  );
});

DeckVisibilityModal.displayName = 'DeckVisibilityModal';
