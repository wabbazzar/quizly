import { LearnModeSettings } from '@/types';

/**
 * Decides whether the Results screen should offer a "Repeat with free text
 * mode" button. The rule (per user intent): show it when the session was
 * multiple-choice-only AND every card in the deck has been passed correctly
 * across the current + prior retry rounds. No mastery/consecutive-correct
 * gating — "getting them all right" is sufficient.
 */
export function shouldShowRepeatFreeText(params: {
  settings?: LearnModeSettings;
  deckCardCount: number;
  passedCardIndices: number[];
  previouslyExcludedIndices: number[];
}): boolean {
  const { settings, deckCardCount, passedCardIndices, previouslyExcludedIndices } = params;
  if (!settings || deckCardCount <= 0) return false;

  const isMultipleChoiceOnly =
    settings.questionTypeMix === 'multiple_choice' ||
    (settings.questionTypes?.length === 1 && settings.questionTypes[0] === 'multiple_choice');
  if (!isMultipleChoiceOnly) return false;

  const cumulative = new Set([...(previouslyExcludedIndices || []), ...(passedCardIndices || [])]);
  return cumulative.size >= deckCardCount;
}
