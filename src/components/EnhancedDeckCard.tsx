import { FC, memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Deck } from '@/types';
import {
  FlashcardsIcon,
  LearnIcon,
  MatchIcon,
  TestIcon,
  CardsIcon,
  LevelsIcon,
  ClockIcon,
} from '@/components/icons/ModeIcons';
import styles from './EnhancedDeckCard.module.css';

interface ModeConfig {
  id: 'flashcards' | 'learn' | 'match' | 'test';
  label: string;
  icon: FC<{ className?: string }>;
  color: string;
  description: string;
  route: string;
}

interface DeckProgress {
  overall: number;
  byMode: Record<string, number>;
  lastStudied?: Date;
}

interface EnhancedDeckCardProps {
  deck: Deck;
  progress?: DeckProgress;
  onModeSelect?: (deckId: string, mode: string) => void;
}

const formatLastStudied = (date?: Date): string => {
  if (!date) return 'Never';

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
};

const CircularProgress: FC<{ value: number }> = ({ value }) => {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width="48" height="48" className={styles.progressSvg}>
      <circle
        cx="24"
        cy="24"
        r={radius}
        className={styles.progressBackground}
        strokeWidth="3"
        fill="none"
      />
      <circle
        cx="24"
        cy="24"
        r={radius}
        className={styles.progressFill}
        strokeWidth="3"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
      <text x="24" y="24" className={styles.progressText} textAnchor="middle" dy="0.3em">
        {Math.round(value)}%
      </text>
    </svg>
  );
};

const DifficultyBadge: FC<{ level?: string }> = ({ level }) => {
  if (!level) return null;

  return (
    <span className={`${styles.difficultyBadge} ${styles[level.replace('_', '-')]}`}>
      {level.replace('_', ' ')}
    </span>
  );
};

export const EnhancedDeckCard: FC<EnhancedDeckCardProps> = memo(({
  deck,
  progress = { overall: 0, byMode: {} },
  onModeSelect,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const { metadata } = deck;

  const modes: ModeConfig[] = [
    {
      id: 'flashcards',
      label: 'Flashcards',
      icon: FlashcardsIcon,
      color: 'primary',
      description: 'Classic flip cards',
      route: `/flashcards/${deck.id}`,
    },
    {
      id: 'learn',
      label: 'Learn',
      icon: LearnIcon,
      color: 'secondary',
      description: 'Interactive questions',
      route: `/learn/${deck.id}`,
    },
    {
      id: 'match',
      label: 'Match',
      icon: MatchIcon,
      color: 'purple',
      description: 'Memory game',
      route: `/match/${deck.id}`,
    },
    {
      id: 'test',
      label: 'Test',
      icon: TestIcon,
      color: 'orange',
      description: 'Practice exam',
      route: `/test/${deck.id}`,
    },
  ];

  const handleModeClick = (e: React.MouseEvent, mode: ModeConfig) => {
    e.stopPropagation();
    onModeSelect?.(deck.id, mode.id);
    navigate(mode.route);
  };

  const handleCardClick = () => {
    navigate(`/deck/${deck.id}`);
  };

  return (
    <motion.article
      className={styles.enhancedDeckCard}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={handleCardClick}
      layout
    >
      {/* Progress Ring */}
      {progress.overall > 0 && (
        <div className={styles.progressRing}>
          <CircularProgress value={progress.overall} />
        </div>
      )}

      {/* Deck Info */}
      <header className={styles.cardHeader}>
        <h3 className={styles.deckName}>{metadata.deck_name}</h3>
        <DifficultyBadge level={metadata.difficulty} />
      </header>

      {metadata.description && (
        <p className={styles.description}>
          {metadata.description}
        </p>
      )}

      <div className={styles.stats}>
        <div className={styles.statItem}>
          <CardsIcon className={styles.statIcon} size={16} />
          <span className={styles.statValue}>{metadata.card_count || deck.content.length}</span>
          <span className={styles.statLabel}>cards</span>
        </div>

        {metadata.available_levels && metadata.available_levels.length > 0 && (
          <div className={styles.statItem}>
            <LevelsIcon className={styles.statIcon} size={16} />
            <span className={styles.statValue}>{metadata.available_levels.length}</span>
            <span className={styles.statLabel}>levels</span>
          </div>
        )}

        <div className={styles.statItem}>
          <ClockIcon className={styles.statIcon} size={16} />
          <span className={styles.statValue}>{formatLastStudied(progress.lastStudied)}</span>
        </div>
      </div>

      {/* Tags */}
      {metadata.tags && metadata.tags.length > 0 && (
        <div className={styles.tags}>
          {metadata.tags.slice(0, 3).map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
          {metadata.tags.length > 3 && (
            <span className={styles.tag}>+{metadata.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Mode Selection Strip */}
      <motion.div
        className={styles.modeStrip}
        initial={false}
        animate={{ opacity: isHovered ? 1 : 0.8 }}
      >
        {modes.map((mode) => (
          <motion.button
            key={mode.id}
            className={`${styles.modeButton} ${styles[mode.id]}`}
            onClick={(e) => handleModeClick(e, mode)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label={`Study ${metadata.deck_name} with ${mode.label} mode`}
            title={mode.description}
          >
            <mode.icon className={styles.modeIcon} />
            <span className={styles.modeLabel}>{mode.label}</span>
            {progress.byMode[mode.id] && progress.byMode[mode.id] > 0 && (
              <motion.span
                className={styles.modeProgress}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {progress.byMode[mode.id]}%
              </motion.span>
            )}
          </motion.button>
        ))}
      </motion.div>
    </motion.article>
  );
});

EnhancedDeckCard.displayName = 'EnhancedDeckCard';

export default EnhancedDeckCard;