import { FC, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HomeIcon } from '../icons/NavigationIcons';
import { FlashcardsIcon, MatchIcon, MusicIcon } from '../icons/ModeIcons';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import styles from './BottomNavBar.module.css';

// Pages where bottom nav should be hidden
const HIDDEN_PATHS = ['/audio', '/all-flashcards', '/all-match'];

export const BottomNavBar: FC = memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isPlaying } = useAudioPlayerStore();

  // Hide on specific pages
  if (HIDDEN_PATHS.some((path) => location.pathname.startsWith(path))) {
    return null;
  }

  // Also hide on deck-specific mode pages
  if (
    location.pathname.includes('/flashcards/') ||
    location.pathname.includes('/match/') ||
    location.pathname.includes('/learn/') ||
    location.pathname.includes('/read/')
  ) {
    return null;
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className={styles.navBar} aria-label="Bottom navigation">
      <button
        className={`${styles.navButton} ${isActive('/') ? styles.active : ''}`}
        onClick={() => navigate('/')}
        aria-label="Home"
      >
        <span className={styles.iconWrapper}>
          <HomeIcon size={24} />
        </span>
        <span className={styles.label}>Home</span>
      </button>

      <button
        className={`${styles.navButton} ${isActive('/all-flashcards') ? styles.active : ''}`}
        onClick={() => navigate('/all-flashcards')}
        aria-label="Flashcards"
      >
        <span className={styles.iconWrapper}>
          <FlashcardsIcon size={24} />
        </span>
        <span className={styles.label}>Cards</span>
      </button>

      <button
        className={`${styles.navButton} ${isActive('/all-match') ? styles.active : ''}`}
        onClick={() => navigate('/all-match')}
        aria-label="Match"
      >
        <span className={styles.iconWrapper}>
          <MatchIcon size={24} />
        </span>
        <span className={styles.label}>Match</span>
      </button>

      <button
        className={`${styles.navButton} ${isPlaying ? styles.active : ''}`}
        onClick={() => navigate('/audio')}
        aria-label="Audio player"
      >
        <span className={styles.iconWrapper}>
          <MusicIcon size={24} />
          {isPlaying && <span className={styles.playingIndicator} />}
        </span>
        <span className={styles.label}>Audio</span>
      </button>
    </nav>
  );
});

BottomNavBar.displayName = 'BottomNavBar';
