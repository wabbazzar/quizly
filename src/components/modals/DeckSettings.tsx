import { FC, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Deck } from '@/types';
import { TrophyIcon, InformationCircleIcon } from '@/components/icons/StatusIcons';
import styles from './DeckSettings.module.css';

interface DeckSettingsProps {
  visible: boolean;
  onClose: () => void;
  deck: Deck | null;
  onResetMastery: () => void;
}

const DeckSettings: FC<DeckSettingsProps> = ({ visible, onClose, deck, onResetMastery }) => {
  const [isConfirming, setIsConfirming] = useState(false);

  if (!deck) return null;

  const handleReset = () => {
    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }
    onResetMastery();
    setIsConfirming(false);
    onClose();
  };

  const cancelConfirm = () => setIsConfirming(false);

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <header className={styles.header}>
              <h2 className={styles.title}>Deck Settings</h2>
              <button className={styles.closeButton} onClick={onClose} aria-label="Close settings">
                ✕
              </button>
            </header>

            <div className={styles.content}>
              {/* Deck Information */}
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  <InformationCircleIcon size={20} className={styles.sectionIcon} />
                  Deck Information
                </h3>
                <div className={styles.infoBox}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Deck Name:</span>
                    <span className={styles.infoValue}>{deck.metadata.deck_name}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Total Cards:</span>
                    <span className={styles.infoValue}>{deck.content.length}</span>
                  </div>
                  {deck.metadata.description && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Description:</span>
                      <span className={styles.infoValue}>{deck.metadata.description}</span>
                    </div>
                  )}
                  {deck.metadata.tags && deck.metadata.tags.length > 0 && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Tags:</span>
                      <span className={styles.infoValue}>{deck.metadata.tags.join(', ')}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Mastery Management */}
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  <TrophyIcon size={20} className={styles.sectionIcon} />
                  Mastery Management
                </h3>
                <div className={styles.resetBox}>
                  <p className={styles.resetDescription}>
                    Reset the mastered card list for this deck. This will clear all mastery progress
                    and allow you to restart learning from scratch.
                  </p>
                  <div className={styles.warningBox}>
                    <InformationCircleIcon size={16} className={styles.warningIcon} />
                    <span className={styles.warningText}>
                      This action cannot be undone. All mastery progress will be permanently lost.
                    </span>
                  </div>
                  <div className={styles.resetActions}>
                    {!isConfirming ? (
                      <button className={styles.resetButton} onClick={handleReset}>
                        Reset Mastered Cards
                      </button>
                    ) : (
                      <div className={styles.confirmRow}>
                        <span className={styles.confirmText}>
                          Are you sure you want to reset all mastery progress?
                        </span>
                        <div className={styles.confirmButtons}>
                          <button className={styles.confirmButton} onClick={handleReset}>
                            Yes, Reset
                          </button>
                          <button className={styles.cancelButton} onClick={cancelConfirm}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>

            <footer className={styles.footer}>
              <button className={styles.closeFooterButton} onClick={onClose}>
                Close
              </button>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DeckSettings;
