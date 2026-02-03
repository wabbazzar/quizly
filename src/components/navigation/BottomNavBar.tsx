import { FC, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MusicIcon } from '../icons/ModeIcons';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import styles from './BottomNavBar.module.css';

export const BottomNavBar: FC = memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isPlaying, tracks, currentTrackIndex } = useAudioPlayerStore();
  const currentTrack = tracks[currentTrackIndex];

  // Don't show bottom nav on audio page
  if (location.pathname === '/audio') {
    return null;
  }

  return (
    <nav className={styles.navBar} aria-label="Bottom navigation">
      <button
        className={`${styles.navButton} ${isPlaying ? styles.active : ''}`}
        onClick={() => navigate('/audio')}
        aria-label="Open audio player"
      >
        <span className={styles.iconWrapper}>
          <MusicIcon size={24} />
          {isPlaying && <span className={styles.playingIndicator} />}
        </span>
        <span className={styles.label}>
          {isPlaying && currentTrack ? `Ch ${currentTrack.chapterNumber}` : 'Audio'}
        </span>
      </button>
    </nav>
  );
});

BottomNavBar.displayName = 'BottomNavBar';
