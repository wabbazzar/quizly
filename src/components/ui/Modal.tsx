import { FC, memo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ModalProps } from './types';
import { Button } from './Button';
import styles from './Modal.module.css';

export const Modal: FC<ModalProps> = memo(({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  showCloseButton = true,
  closeOnOverlayClick = true,
  className = '',
  footer
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // Handle escape key
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Handle overlay click
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  }, [closeOnOverlayClick, onClose]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Store currently focused element
      previousActiveElement.current = document.activeElement;

      // Add escape listener
      document.addEventListener('keydown', handleEscape);

      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      // Focus modal
      if (modalRef.current) {
        modalRef.current.focus();
      }

      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';

        // Restore focus to previous element
        if (previousActiveElement.current instanceof HTMLElement) {
          previousActiveElement.current.focus();
        }
      };
    }
    return undefined;
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const modalClasses = [
    styles.modal,
    styles[size],
    className
  ].filter(Boolean).join(' ');

  const modalContent = (
    <div className={styles.overlay} onClick={handleOverlayClick} aria-modal="true" role="dialog">
      <div
        className={modalClasses}
        ref={modalRef}
        tabIndex={-1}
        role="document"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {(title || showCloseButton) && (
          <header className={styles.header}>
            {title && (
              <h2 id="modal-title" className={styles.title}>{title}</h2>
            )}
            {showCloseButton && (
              <Button
                variant="tertiary"
                size="small"
                onClick={onClose}
                className={styles.closeButton}
                aria-label="Close modal"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M15 5L5 15M5 5L15 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Button>
            )}
          </header>
        )}
        <div className={styles.content}>
          {children}
        </div>
        {footer && (
          <footer className={styles.footer}>
            {footer}
          </footer>
        )}
      </div>
    </div>
  );

  // Portal to body
  return createPortal(modalContent, document.body);
});

Modal.displayName = 'Modal';