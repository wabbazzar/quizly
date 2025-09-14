/**
 * Quizly Design System
 *
 * A vibrant yet professional color palette that creates an engaging
 * learning environment while maintaining excellent readability and
 * accessibility. The design emphasizes clarity and focus for
 * effective studying.
 */

export const colors = {
  primary: {
    // Ocean Blue - Evokes trust, stability, and intelligence
    // Used for primary actions, navigation, and key interactive elements
    main: '#4A90E2',    // Confident ocean blue - CTAs, active states
    light: '#6BA5E9',   // Soft sky blue - hover states, highlights
    dark: '#3A7BC8',    // Deep sea blue - pressed states, emphasis
  },
  secondary: {
    // Mint Turquoise - Fresh, energizing, and optimistic
    // Used for success states, progress indicators, and positive feedback
    main: '#50E3C2',    // Vibrant mint - correct answers, achievements
    light: '#6FEBD0',   // Gentle seafoam - subtle success indicators
    dark: '#3DCBAA',    // Rich teal - strong positive emphasis
  },
  neutral: {
    // Carefully crafted grayscale for optimal contrast and hierarchy
    white: '#FFFFFF',    // Pure white - card backgrounds, primary surfaces
    gray100: '#F7F8FA',  // Ghost white - app background, subtle containers
    gray200: '#E5E7EB',  // Mist gray - borders, dividers, disabled states
    gray300: '#D1D5DB',  // Silver gray - inactive elements, placeholders
    gray400: '#9CA3AF',  // Cool gray - secondary text, subtle icons
    gray500: '#6B7280',  // Slate gray - body text, secondary content
    gray600: '#4B5563',  // Charcoal gray - primary text, headings
    gray700: '#374151',  // Dark slate - high emphasis text
    gray800: '#1F2937',  // Near black - maximum contrast text
    black: '#000000',    // True black - reserved for critical emphasis
  },
  semantic: {
    // Functional colors for user feedback and system states
    success: '#10B981',  // Emerald green - correct answers, achievements
    warning: '#F59E0B',  // Amber - warnings, time running out
    error: '#EF4444',    // Coral red - incorrect answers, errors
    info: '#3B82F6',     // Bright blue - hints, information, tips
  }
};

/**
 * Spacing System
 *
 * Based on an 8-point grid system for consistent rhythm and
 * visual harmony across all components. Each increment serves
 * a specific purpose in the visual hierarchy.
 */
export const spacing = {
  xs: 4,   // Hairline spacing - subtle gaps, inline elements
  sm: 8,   // Tight spacing - related elements, compact layouts
  md: 16,  // Default spacing - standard padding, margins
  lg: 24,  // Comfortable spacing - section breaks, card padding
  xl: 32,  // Generous spacing - major sections, breathing room
  xxl: 48, // Maximum spacing - hero sections, major divisions
};

/**
 * Typography Scale
 *
 * Optimized for mobile readability with clear hierarchy.
 * All sizes tested for legibility on small screens.
 */
export const typography = {
  // Headlines - Bold and commanding for screen titles
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
    color: colors.neutral.gray800,
  },
  h2: {
    fontSize: 28,
    fontWeight: '600' as const,
    lineHeight: 36,
    letterSpacing: -0.3,
    color: colors.neutral.gray800,
  },
  h3: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: -0.2,
    color: colors.neutral.gray700,
  },

  // Body text - Optimized for extended reading
  body: {
    large: {
      fontSize: 18,
      fontWeight: '400' as const,
      lineHeight: 28,
      color: colors.neutral.gray600,
    },
    regular: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
      color: colors.neutral.gray600,
    },
    small: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
      color: colors.neutral.gray500,
    },
  },

  // Card text - Larger sizes for flashcard content
  card: {
    primary: {
      fontSize: 24,
      fontWeight: '500' as const,
      lineHeight: 32,
      color: colors.neutral.gray800,
    },
    secondary: {
      fontSize: 20,
      fontWeight: '400' as const,
      lineHeight: 28,
      color: colors.neutral.gray700,
    },
    caption: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 18,
      color: colors.neutral.gray500,
    },
  },
};

/**
 * Shadow System
 *
 * Subtle shadows that create depth without overwhelming
 * the clean, focused interface.
 */
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
};

/**
 * Border Radius System
 *
 * Friendly, approachable rounded corners that soften
 * the interface while maintaining structure.
 */
export const borderRadius = {
  sm: 4,   // Subtle rounding - buttons, inputs
  md: 8,   // Standard rounding - cards, containers
  lg: 12,  // Prominent rounding - modals, featured cards
  xl: 16,  // Strong rounding - floating elements
  full: 9999, // Fully rounded - pills, badges
};