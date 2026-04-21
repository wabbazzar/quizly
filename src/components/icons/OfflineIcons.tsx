import { FC } from 'react';

interface IconProps {
  className?: string;
  size?: number;
  color?: string;
}

/** Download arrow icon (arrow pointing down into a tray). */
export const DownloadIcon: FC<IconProps> = ({ className, size = 24, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <polyline
      points="7 10 12 15 17 10"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="12"
      y1="15"
      x2="12"
      y2="3"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Checkmark inside a circle — indicates "downloaded / available offline". */
export const DownloadedIcon: FC<IconProps> = ({ className, size = 24, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke={color}
      strokeWidth="2"
    />
    <path
      d="M8 12l3 3 5-5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Trash/remove icon for removing offline data. */
export const RemoveDownloadIcon: FC<IconProps> = ({ className, size = 24, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="9"
      y1="9"
      x2="15"
      y2="9"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

/** Wifi-off icon for offline indicator. */
export const OfflineIcon: FC<IconProps> = ({ className, size = 24, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <line
      x1="1"
      y1="1"
      x2="23"
      y2="23"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M16.72 11.06A10.94 10.94 0 0119 12.55"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5 12.55a10.94 10.94 0 015.17-2.39"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10.71 5.05A16 16 0 0122.56 9"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M1.42 9a15.91 15.91 0 014.7-2.88"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8.53 16.11a6 6 0 016.95 0"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="12"
      cy="20"
      r="1"
      fill={color}
    />
  </svg>
);
