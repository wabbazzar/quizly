import { FC, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/types';
import styles from './CardDetailsModal.module.css';

interface CardDetailsModalProps {
  card: Card | null;
  visible: boolean;
  onClose: () => void;
  frontSides?: string[];
  backSides?: string[];
}

const CardDetailsModal: FC<CardDetailsModalProps> = ({
  card,
  visible,
  onClose,
  frontSides = ['side_a'],
  backSides = ['side_b'],
}) => {
  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visible) {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [visible, onClose]);

  if (!card) return null;

  // Get content for each side
  const getSideContent = (sides: string[]) => {
    return sides
      .filter(side => card[side as keyof Card])
      .map(side => ({
        label: side.replace('side_', 'Side ').toUpperCase(),
        content: card[side as keyof Card] as string,
      }));
  };

  const frontContent = getSideContent(frontSides);
  const backContent = getSideContent(backSides);

  // Get all available sides for full detail view
  const allSides = ['side_a', 'side_b', 'side_c', 'side_d', 'side_e', 'side_f']
    .filter(side => card[side as keyof Card])
    .map(side => ({
      label: side.replace('side_', 'Side ').toUpperCase(),
      content: card[side as keyof Card] as string,
    }));

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className={styles.modalContent}>
              <header className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>Card Details</h2>
                <button
                  className={styles.closeButton}
                  onClick={onClose}
                  aria-label="Close modal"
                >
                  ×
                </button>
              </header>

              <div className={styles.modalBody}>
                {/* Show configured front/back content */}
                <section className={styles.configuredContent}>
                  <div className={styles.sideGroup}>
                    <h3 className={styles.sideGroupTitle}>Front Side{frontContent.length > 1 ? 's' : ''}</h3>
                    {frontContent.map((item, index) => (
                      <div key={index} className={styles.sideItem}>
                        <span className={styles.sideLabel}>{item.label}:</span>
                        <p className={styles.sideContent}>{item.content}</p>
                      </div>
                    ))}
                  </div>

                  <div className={styles.sideGroup}>
                    <h3 className={styles.sideGroupTitle}>Back Side{backContent.length > 1 ? 's' : ''}</h3>
                    {backContent.map((item, index) => (
                      <div key={index} className={styles.sideItem}>
                        <span className={styles.sideLabel}>{item.label}:</span>
                        <p className={styles.sideContent}>{item.content}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Show all available sides if there are additional sides */}
                {allSides.length > (frontContent.length + backContent.length) && (
                  <section className={styles.allSides}>
                    <h3 className={styles.allSidesTitle}>All Available Sides</h3>
                    <div className={styles.sidesGrid}>
                      {allSides.map((item, index) => (
                        <div key={index} className={styles.sideCard}>
                          <div className={styles.sideCardHeader}>
                            <span className={styles.sideCardLabel}>{item.label}</span>
                          </div>
                          <p className={styles.sideCardContent}>{item.content}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Card metadata */}
                {(card.level !== undefined || card.idx !== undefined) && (
                  <section className={styles.metadata}>
                    <div className={styles.metadataItems}>
                      {card.level !== undefined && (
                        <span className={styles.metadataItem}>
                          <strong>Level:</strong> {card.level}
                        </span>
                      )}
                      {card.idx !== undefined && (
                        <span className={styles.metadataItem}>
                          <strong>Index:</strong> {card.idx + 1}
                        </span>
                      )}
                    </div>
                  </section>
                )}
              </div>

              <footer className={styles.modalFooter}>
                <button
                  className={styles.actionButton}
                  onClick={onClose}
                >
                  Close
                </button>
              </footer>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CardDetailsModal;