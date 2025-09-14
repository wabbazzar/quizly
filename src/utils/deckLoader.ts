import { Deck } from '@/types';

export const loadDeckFromJSON = async (jsonPath: string): Promise<Deck> => {
  try {
    const response = await fetch(jsonPath);
    if (!response.ok) {
      throw new Error(`Failed to load deck from ${jsonPath}`);
    }

    const rawDeck = await response.json();

    // Transform and validate the deck data
    const deck: Deck = {
      id: rawDeck.id || rawDeck.deck_id || 'unknown',
      metadata: {
        ...rawDeck.metadata,
        created_date: rawDeck.metadata.created_date.split('T')[0],
        last_updated: rawDeck.metadata.last_updated.split('T')[0],
      },
      content: rawDeck.content.map((card: any, index: number) => ({
        idx: index,
        name: card.name,
        side_a: card.side_a,
        side_b: card.side_b,
        side_c: card.side_c,
        side_d: card.side_d,
        side_e: card.side_e,
        side_f: card.side_f,
        level: card.level || 1,
      })),
    };

    return deck;
  } catch (error) {
    console.error('Error loading deck from JSON:', error);
    throw error;
  }
};

export const loadAllDecks = async (): Promise<Deck[]> => {
  const deckPaths = [
    '/data/decks/chinese_chpt9.json',
    // Add more deck paths as they're added
  ];

  const decks = await Promise.all(
    deckPaths.map(path => loadDeckFromJSON(path))
  );

  return decks.filter(Boolean); // Filter out any failed loads
};