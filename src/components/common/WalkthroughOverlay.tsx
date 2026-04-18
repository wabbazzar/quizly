import { FC, useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './WalkthroughOverlay.module.css';

export interface WalkthroughStep {
  targetSelector?: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: { label: string; onClick: () => void };
}

interface WalkthroughOverlayProps {
  steps: WalkthroughStep[];
  storageKey?: string;
  onComplete?: () => void;
}

const PADDING = 8;

export const WalkthroughOverlay: FC<WalkthroughOverlayProps> = ({
  steps,
  storageKey = 'quizly_walkthrough_complete',
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Check if already completed
  useEffect(() => {
    if (localStorage.getItem(storageKey) === 'true') return;
    // Slight delay so the page renders first
    const timer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(timer);
  }, [storageKey]);

  // Position spotlight on target element
  useEffect(() => {
    if (!visible) return;
    const step = steps[currentStep];
    if (!step?.targetSelector) {
      setSpotlightRect(null);
      return;
    }
    const el = document.querySelector(step.targetSelector);
    if (el) {
      setSpotlightRect(el.getBoundingClientRect());
    } else {
      setSpotlightRect(null);
    }
  }, [visible, currentStep, steps]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Done
      localStorage.setItem(storageKey, 'true');
      setVisible(false);
      onComplete?.();
    }
  }, [currentStep, steps.length, storageKey, onComplete]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(storageKey, 'true');
    setVisible(false);
    onComplete?.();
  }, [storageKey, onComplete]);

  if (!visible || steps.length === 0) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!spotlightRect) {
      // No target -- center on screen
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const pos = step.position || 'bottom';
    const base: React.CSSProperties = {};

    if (pos === 'bottom') {
      base.top = spotlightRect.bottom + PADDING + 12;
      base.left = Math.max(16, Math.min(spotlightRect.left, window.innerWidth - 296));
    } else if (pos === 'top') {
      base.bottom = window.innerHeight - spotlightRect.top + PADDING + 12;
      base.left = Math.max(16, Math.min(spotlightRect.left, window.innerWidth - 296));
    } else {
      base.top = spotlightRect.top;
      base.left = pos === 'right' ? spotlightRect.right + 12 : spotlightRect.left - 292;
    }

    return base;
  };

  return createPortal(
    <div className={styles.overlay}>
      {/* Backdrop with spotlight cutout */}
      {spotlightRect ? (
        <div
          className={styles.spotlight}
          style={{
            top: spotlightRect.top - PADDING,
            left: spotlightRect.left - PADDING,
            width: spotlightRect.width + PADDING * 2,
            height: spotlightRect.height + PADDING * 2,
          }}
        />
      ) : (
        <div className={styles.backdrop} onClick={handleSkip} />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={styles.tooltip}
        style={getTooltipStyle()}
      >
        <h3 className={styles.tooltipTitle}>{step.title}</h3>
        <p className={styles.tooltipBody}>{step.description}</p>

        <div className={styles.tooltipFooter}>
          <span className={styles.stepCounter}>
            {currentStep + 1} of {steps.length}
          </span>
          <div className={styles.tooltipActions}>
            {!isLast && (
              <button className={styles.skipButton} onClick={handleSkip} type="button">
                Skip
              </button>
            )}
            {step.action ? (
              <button
                className={styles.nextButton}
                onClick={() => { step.action!.onClick(); handleNext(); }}
                type="button"
              >
                {step.action.label}
              </button>
            ) : (
              <button className={styles.nextButton} onClick={handleNext} type="button">
                {isLast ? 'Get Started' : 'Next'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
