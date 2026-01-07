import { FC, useMemo } from 'react';
import { Deck } from '@/types';
import { Button } from '@/components/ui/Button';
// CheckIcon inline SVG
import styles from './ReadDialoguePicker.module.css';

interface ReadProgress {
  dialogueId: string;
  lineIndex: number;
  tokenIndex: number;
  completedTokens: Set<string>;
  masteredTokens: Set<string>;
}

interface Props {
  deck: Deck;
  selectedDialogueId: string | null;
  onSelectDialogue: (dialogueId: string) => void;
  progress: ReadProgress | null;
}

export const ReadDialoguePicker: FC<Props> = ({
  deck,
  selectedDialogueId,
  onSelectDialogue,
  progress
}) => {
  // Calculate progress for each dialogue
  const dialogueProgress = useMemo(() => {
    if (!deck.reading) return {};

    const result: Record<string, { completed: number; total: number }> = {};

    Object.entries(deck.reading.dialogues).forEach(([dialogueId, dialogue]) => {
      const totalTokens = dialogue.lines.reduce((acc, line) => {
        // Count tokens based on available sides
        let tokenCount = 0;
        if (line.a) tokenCount++;
        if (line.b) tokenCount++;
        if (line.c) tokenCount++;
        return acc + tokenCount;
      }, 0);

      const completedTokens = progress?.completedTokens
        ? Array.from(progress.completedTokens).filter(key =>
            key.startsWith(`${dialogueId}:`)
          ).length
        : 0;

      result[dialogueId] = {
        completed: completedTokens,
        total: totalTokens
      };
    });

    return result;
  }, [deck, progress]);

  if (!deck.reading) return null;

  const dialogueEntries = Object.entries(deck.reading.dialogues);

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Practice</h3>
      <div className={styles.dialogueList}>
        {dialogueEntries.map(([dialogueId, dialogue]) => {
          const isSelected = selectedDialogueId === dialogueId;
          const dialogueStats = dialogueProgress[dialogueId];
          const progressPercentage = dialogueStats
            ? (dialogueStats.completed / dialogueStats.total) * 100
            : 0;

          // Create a friendly display name
          const displayName = dialogueId
            .replace(/dialogue(\d+)/, 'Dialogue $1')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());

          return (
            <Button
              key={dialogueId}
              variant={isSelected ? 'primary' : 'secondary'}
              className={`${styles.dialogueButton} ${isSelected ? styles.selected : ''}`}
              onClick={() => onSelectDialogue(dialogueId)}
            >
              <div className={styles.dialogueContent}>
                <div className={styles.dialogueHeader}>
                  <span className={styles.dialogueName}>{displayName}</span>
                  {progressPercentage === 100 && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.completeIcon}>
                      <path d="M20 6L9 17L4 12" />
                    </svg>
                  )}
                </div>
                <div className={styles.dialogueInfo}>
                  <span className={styles.lineCount}>
                    {dialogue.lines.length} lines
                  </span>
                  {dialogueStats && dialogueStats.completed > 0 && (
                    <span className={styles.progress}>
                      {dialogueStats.completed}/{dialogueStats.total} tokens
                    </span>
                  )}
                </div>
                {progressPercentage > 0 && progressPercentage < 100 && (
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                )}
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
};