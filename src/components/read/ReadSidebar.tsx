import { FC } from 'react';
import { Deck } from '@/types';
import { ReadDialoguePicker } from './ReadDialoguePicker';
import { TranscriptPicker } from './TranscriptPicker';
import styles from './ReadSidebar.module.css';

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

export const ReadSidebar: FC<Props> = ({
  deck,
  selectedDialogueId,
  onSelectDialogue,
  progress,
}) => {
  const hasDialogues = deck.reading && Object.keys(deck.reading.dialogues).length > 0;

  return (
    <div className={styles.sidebar}>
      {hasDialogues && (
        <ReadDialoguePicker
          deck={deck}
          selectedDialogueId={selectedDialogueId}
          onSelectDialogue={onSelectDialogue}
          progress={progress}
        />
      )}

      <div className={styles.divider} />

      <TranscriptPicker deckId={deck.id} />
    </div>
  );
};
