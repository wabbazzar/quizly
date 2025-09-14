/**
 * Dynamic JSON deck loader that transforms JSON to match our TypeScript model
 * This allows easy deck sharing and import/export functionality
 */

import { Deck } from '@/types';

interface RawDeckJSON {
  deck_id?: string;  // Optional, will use 'id' if present
  id?: string;
  metadata: {
    deck_name: string;
    description: string;
    category: string;
    available_levels: number[];
    available_sides: number;
    card_count: number;
    difficulty: string;
    tags: string[];
    version: string;
    created_date: string;
    last_updated: string;
  };
  content: Array<{
    card_id?: string;  // Will be removed
    idx: number;
    name: string;
    side_a: string;
    side_b: string;
    side_c?: string;
    side_d?: string;
    side_e?: string;
    side_f?: string;
    level: number;
  }>;
}

export const loadDeckFromJSON = async (jsonData: any): Promise<Deck> => {
  try {
    const rawDeck: RawDeckJSON = jsonData;

    // Transform to our Deck model
    const deck: Deck = {
      // Use 'id' or 'deck_id' from JSON
      id: rawDeck.id || rawDeck.deck_id || 'unknown',
      metadata: {
        ...rawDeck.metadata,
        difficulty: rawDeck.metadata.difficulty as any,
        // Ensure dates are in correct format
        created_date: rawDeck.metadata.created_date.split('T')[0],
        last_updated: rawDeck.metadata.last_updated.split('T')[0],
      },
      content: rawDeck.content.map((card, index) => ({
        // Ensure idx starts at 0 and increments properly
        idx: index,
        name: card.name,
        side_a: card.side_a,
        side_b: card.side_b,
        side_c: card.side_c,
        side_d: card.side_d,
        side_e: card.side_e,
        side_f: card.side_f,
        level: card.level,
        // Remove card_id if present (not in our model)
      })),
    };

    return deck;
  } catch (error) {
    console.error('Error loading deck from JSON:', error);
    throw error;
  }
};

// Load all decks from assets
export const loadAllDecks = async (): Promise<Deck[]> => {
  try {
    // Import the Chinese Chapter 9 deck
    const chineseChpt9 = require('@assets/decks/chinese_chpt9.json');

    const decks = await Promise.all([
      loadDeckFromJSON(chineseChpt9),
      // Add more deck imports here as they're added
    ]);

    return decks;
  } catch (error) {
    console.error('Error loading decks:', error);
    return [];
  }
};