import { FC, memo } from 'react';
import { DeckHeaderProps } from './types';
import { PageHeader } from '@/components/common/PageHeader';

export const DeckHeader: FC<DeckHeaderProps> = memo(({ deck, onBackClick, onSettingsClick }) => {
  // Add safety check for deck
  if (!deck || !deck.content || !deck.metadata) {
    return null;
  }

  const statsText = `${deck.content.length} cards${deck.metadata.difficulty ? ` • ${deck.metadata.difficulty.replace('_', ' ')}` : ''}${deck.metadata.tags && deck.metadata.tags.length > 0 ? ` • ${deck.metadata.tags.slice(0, 2).join(', ')}` : ''}`;

  return (
    <PageHeader
      title={deck.metadata.deck_name}
      subtitle={deck.metadata.deck_subtitle || deck.metadata.description || statsText}
      onBackClick={onBackClick}
      backLabel="Home"
      onSettingsClick={onSettingsClick}
      showSettings={true}
    />
  );
});

DeckHeader.displayName = 'DeckHeader';
