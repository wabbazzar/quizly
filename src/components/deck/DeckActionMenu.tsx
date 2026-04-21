import { FC, useState, useCallback, useRef, useEffect } from 'react';
import styles from './DeckActionMenu.module.css';

interface DeckActionMenuProps {
  onNewDeck: () => void;
  onImport: () => void;
  onManageVisibility: () => void;
  onManageOffline?: () => void;
}

/**
 * Hierarchical action menu for deck management.
 * Single trigger button opens a dropdown with organized actions.
 */
export const DeckActionMenu: FC<DeckActionMenuProps> = ({
  onNewDeck,
  onImport,
  onManageVisibility,
  onManageOffline,
}) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const handleAction = useCallback((action: () => void) => {
    setOpen(false);
    action();
  }, []);

  return (
    <div className={styles.container} ref={menuRef}>
      <button
        className={styles.trigger}
        onClick={() => setOpen(prev => !prev)}
        aria-label="Deck actions"
        aria-expanded={open}
        type="button"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      </button>

      {open && (
        <div className={styles.dropdown} role="menu">
          <div className={styles.section}>
            <span className={styles.sectionLabel}>Create</span>
            <button
              className={styles.item}
              onClick={() => handleAction(onNewDeck)}
              role="menuitem"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Deck
            </button>
            <button
              className={styles.item}
              onClick={() => handleAction(onImport)}
              role="menuitem"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Import JSON
            </button>
          </div>
          <div className={styles.divider} />
          <div className={styles.section}>
            <span className={styles.sectionLabel}>Manage</span>
            <button
              className={styles.item}
              onClick={() => handleAction(onManageVisibility)}
              role="menuitem"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Show / Hide Decks
            </button>
            {onManageOffline && (
              <button
                className={styles.item}
                onClick={() => handleAction(onManageOffline)}
                role="menuitem"
                type="button"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Offline Storage
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
