import { Variants, Transition } from 'framer-motion';

/**
 * Animation configurations for Match Mode components
 *
 * Provides smooth, 60 FPS animations optimized for mobile performance:
 * - Match success feedback with celebration effects
 * - Card removal animations for successful matches
 * - Grid state transitions and updates
 * - Mobile performance optimizations using GPU acceleration
 */

// Common transition settings optimized for performance
const FAST_TRANSITION: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
  mass: 0.8,
};

const SMOOTH_TRANSITION: Transition = {
  type: 'spring',
  stiffness: 200,
  damping: 25,
  mass: 1,
};

const CELEBRATION_TRANSITION: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 20,
  mass: 0.6,
};

/**
 * Card match success animation variants
 * Provides satisfying feedback when cards are successfully matched
 */
export const matchSuccessVariants: Variants = {
  initial: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    filter: 'brightness(1) saturate(1)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  matching: {
    scale: [1, 1.05, 1.1],
    rotate: [0, -2, 2, 0],
    filter: 'brightness(1.2) saturate(1.3)',
    boxShadow: [
      '0 2px 8px rgba(0, 0, 0, 0.1)',
      '0 8px 25px rgba(74, 144, 226, 0.3)',
      '0 12px 35px rgba(74, 144, 226, 0.4)',
    ],
    transition: {
      duration: 0.4,
      times: [0, 0.5, 1],
      ease: 'easeOut',
    },
  },
  matched: {
    scale: 0.95,
    opacity: 0.7,
    filter: 'brightness(0.9) saturate(0.8)',
    borderColor: 'var(--semantic-success)',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    transition: SMOOTH_TRANSITION,
  },
  removing: {
    scale: [0.95, 1.1, 0],
    rotate: [0, 5, -5, 0],
    opacity: [0.7, 1, 0],
    filter: 'brightness(1.3) saturate(1.5)',
    y: [0, -10, -20],
    transition: {
      duration: 0.6,
      times: [0, 0.3, 1],
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

/**
 * Card mismatch feedback animation variants
 * Subtle shake animation for incorrect matches
 */
export const matchMismatchVariants: Variants = {
  initial: {
    x: 0,
    scale: 1,
    filter: 'brightness(1)',
  },
  mismatch: {
    x: [-2, 2, -2, 2, 0],
    scale: [1, 0.98, 1],
    filter: ['brightness(1)', 'brightness(1.1)', 'brightness(1)'],
    transition: {
      duration: 0.5,
      times: [0, 0.25, 0.5, 0.75, 1],
      ease: 'easeInOut',
    },
  },
};

/**
 * Card selection animation variants
 * Visual feedback for card tap/click interactions
 */
export const cardSelectionVariants: Variants = {
  unselected: {
    scale: 1,
    borderColor: 'var(--border-color)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    filter: 'brightness(1)',
    y: 0,
    transition: FAST_TRANSITION,
  },
  selected: {
    scale: 1.02,
    borderColor: 'var(--primary-main)',
    boxShadow: '0 6px 20px rgba(74, 144, 226, 0.25)',
    filter: 'brightness(1.05)',
    y: -2,
    transition: FAST_TRANSITION,
  },
  hover: {
    scale: 1.01,
    y: -1,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    transition: FAST_TRANSITION,
  },
};

/**
 * Grid layout animation variants
 * Smooth transitions when grid content changes
 */
export const gridLayoutVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.9,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.2,
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

/**
 * Individual card entry animation variants
 * Staggered entrance for grid cards
 */
export const cardEntryVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.8,
    y: 20,
    rotateY: -90,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    rotateY: 0,
    transition: SMOOTH_TRANSITION,
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: -10,
    transition: FAST_TRANSITION,
  },
};

/**
 * Match celebration animation variants
 * Particles and effects for successful matches
 */
export const celebrationVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0,
    rotate: 0,
  },
  celebrate: {
    opacity: [0, 1, 1, 0],
    scale: [0, 1.2, 1.5, 0],
    rotate: [0, 180, 360],
    transition: {
      duration: 1,
      times: [0, 0.2, 0.8, 1],
      ease: 'easeOut',
    },
  },
};

/**
 * Progress bar animation variants
 * Smooth progress updates with elastic feel
 */
export const progressVariants: Variants = {
  initial: {
    scaleX: 0,
    originX: 0,
  },
  animate: {
    scaleX: 1,
    transition: {
      ...CELEBRATION_TRANSITION,
      duration: 0.8,
    },
  },
};

/**
 * Game completion animation variants
 * Final celebration when all matches are found
 */
export const gameCompleteVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.5,
    y: 50,
  },
  animate: {
    opacity: 1,
    scale: [0.5, 1.1, 1],
    y: 0,
    transition: {
      duration: 0.6,
      times: [0, 0.6, 1],
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -20,
    transition: FAST_TRANSITION,
  },
};

/**
 * Pause overlay animation variants
 * Smooth fade for pause state
 */
export const pauseOverlayVariants: Variants = {
  initial: {
    opacity: 0,
    backdropFilter: 'blur(0px)',
  },
  animate: {
    opacity: 1,
    backdropFilter: 'blur(8px)',
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    backdropFilter: 'blur(0px)',
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

/**
 * Performance-optimized spring configuration
 * Reduces motion for lower-end devices
 */
export const getOptimizedTransition = (isLowPerformance = false): Transition => {
  if (isLowPerformance) {
    return {
      type: 'tween',
      duration: 0.2,
      ease: 'easeOut',
    };
  }

  return SMOOTH_TRANSITION;
};

/**
 * Utility function to create staggered animations
 */
export const createStaggeredAnimation = (
  delay = 0.05,
  duration = 0.3
): Transition => ({
  duration,
  staggerChildren: delay,
  delayChildren: delay,
});

/**
 * Mobile performance optimizations
 * Reduces complexity for touch devices
 */
export const getMobileOptimizedVariants = (
  variants: Variants,
  isMobile = false
): Variants => {
  if (!isMobile) return variants;

  // Simplify animations for mobile
  return Object.entries(variants).reduce((acc, [key, value]) => {
    if (typeof value === 'object' && value !== null) {
      const mobileValue = { ...value };

      // Remove complex transformations
      if ('filter' in mobileValue) delete mobileValue.filter;
      if ('boxShadow' in mobileValue && Array.isArray(mobileValue.boxShadow)) {
        mobileValue.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
      }

      // Reduce scale changes
      if ('scale' in mobileValue && Array.isArray(mobileValue.scale)) {
        const scaleArray = mobileValue.scale as number[];
        mobileValue.scale = [scaleArray[0], scaleArray[scaleArray.length - 1]];
      }

      acc[key] = mobileValue;
    } else {
      acc[key] = value;
    }

    return acc;
  }, {} as Variants);
};

/**
 * Reduced motion variants for accessibility
 */
export const getReducedMotionVariants = (variants: Variants): Variants => {
  return Object.entries(variants).reduce((acc, [key, value]) => {
    if (typeof value === 'object' && value !== null) {
      const reducedValue = { ...value };

      // Remove scale and rotation animations
      if ('scale' in reducedValue) reducedValue.scale = 1;
      if ('rotate' in reducedValue) reducedValue.rotate = 0;
      if ('rotateY' in reducedValue) reducedValue.rotateY = 0;

      // Keep only opacity and basic position changes
      const allowedProps = ['opacity', 'x', 'y', 'backgroundColor', 'borderColor'];
      Object.keys(reducedValue).forEach(prop => {
        if (!allowedProps.includes(prop) && prop !== 'transition') {
          delete reducedValue[prop as keyof typeof reducedValue];
        }
      });

      // Simplify transitions
      if (reducedValue.transition) {
        reducedValue.transition = { duration: 0.1 };
      }

      acc[key] = reducedValue;
    } else {
      acc[key] = value;
    }

    return acc;
  }, {} as Variants);
};

export default {
  matchSuccessVariants,
  matchMismatchVariants,
  cardSelectionVariants,
  gridLayoutVariants,
  cardEntryVariants,
  celebrationVariants,
  progressVariants,
  gameCompleteVariants,
  pauseOverlayVariants,
  getOptimizedTransition,
  createStaggeredAnimation,
  getMobileOptimizedVariants,
  getReducedMotionVariants,
};