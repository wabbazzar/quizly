import { FC } from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

export const FlashcardsIcon: FC<IconProps> = ({ className, size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M3 11h18" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="8.5" r="0.5" fill="currentColor" />
    <circle cx="12" cy="14.5" r="0.5" fill="currentColor" />
  </svg>
);

export const LearnIcon: FC<IconProps> = ({ className, size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 12l2 2 4-4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const MatchIcon: FC<IconProps> = ({ className, size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="2" />
    <rect x="13" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="2" />
    <rect x="3" y="13" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="2" />
    <rect x="13" y="13" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="2" />
    <path d="M7 7v0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M17 17v0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const ReadIcon: FC<IconProps> = ({ className, size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 2v6h6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M9 15h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M9 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M9 7h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Alias TestIcon to ReadIcon for backwards compatibility
export const TestIcon = ReadIcon;

export const CardsIcon: FC<IconProps> = ({ className, size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect x="6" y="4" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M9 8h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M9 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M9 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const LevelsIcon: FC<IconProps> = ({ className, size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path d="M3 20h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <rect x="5" y="14" width="4" height="6" fill="currentColor" />
    <rect x="10" y="10" width="4" height="10" fill="currentColor" />
    <rect x="15" y="6" width="4" height="14" fill="currentColor" />
  </svg>
);

export const ClockIcon: FC<IconProps> = ({ className, size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
