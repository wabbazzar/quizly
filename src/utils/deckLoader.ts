import { Deck, DeckMetadata, Card } from '@/types';

// Sanitization helper to prevent XSS
const sanitizeString = (str: any): string => {
  if (typeof str !== 'string') return '';
  // Basic HTML entity encoding for safety
  // Note: Forward slashes are safe and commonly used in pinyin (e.g., wéi/wèi)
  // Note: Ampersands are safe for text content and commonly used in titles
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
    // Removed forward slash escaping as it's safe and breaks pinyin display
    // Removed ampersand escaping as it's safe for text content and commonly used in titles
};

// Validate deck metadata structure
const validateMetadata = (metadata: any): DeckMetadata | null => {
  if (!metadata || typeof metadata !== 'object') return null;

  // Required fields
  if (!metadata.deck_name || !metadata.description || !metadata.category) {
    console.warn('Deck metadata missing required fields');
    return null;
  }

  // Validate difficulty enum
  const validDifficulties = ['beginner', 'intermediate', 'advanced', 'beginner_to_intermediate'];
  if (!validDifficulties.includes(metadata.difficulty)) {
    console.warn(`Invalid difficulty: ${metadata.difficulty}`);
    return null;
  }

  return {
    deck_name: sanitizeString(metadata.deck_name),
    description: sanitizeString(metadata.description),
    category: sanitizeString(metadata.category),
    available_levels: Array.isArray(metadata.available_levels)
      ? metadata.available_levels.filter((l: any) => typeof l === 'number')
      : [1],
    available_sides: typeof metadata.available_sides === 'number'
      ? Math.min(6, Math.max(2, metadata.available_sides))
      : 2,
    side_labels: metadata.side_labels && typeof metadata.side_labels === 'object'
      ? {
          side_a: metadata.side_labels.side_a ? sanitizeString(metadata.side_labels.side_a) : undefined,
          side_b: metadata.side_labels.side_b ? sanitizeString(metadata.side_labels.side_b) : undefined,
          side_c: metadata.side_labels.side_c ? sanitizeString(metadata.side_labels.side_c) : undefined,
          side_d: metadata.side_labels.side_d ? sanitizeString(metadata.side_labels.side_d) : undefined,
          side_e: metadata.side_labels.side_e ? sanitizeString(metadata.side_labels.side_e) : undefined,
          side_f: metadata.side_labels.side_f ? sanitizeString(metadata.side_labels.side_f) : undefined,
        }
      : undefined,
    card_count: typeof metadata.card_count === 'number' ? metadata.card_count : 0,
    difficulty: metadata.difficulty,
    tags: Array.isArray(metadata.tags)
      ? metadata.tags.map(sanitizeString).filter(Boolean)
      : [],
    version: sanitizeString(metadata.version || '1.0.0'),
    created_date: metadata.created_date ? metadata.created_date.split('T')[0] : new Date().toISOString().split('T')[0],
    last_updated: metadata.last_updated ? metadata.last_updated.split('T')[0] : new Date().toISOString().split('T')[0],
  };
};

// Validate and sanitize card data
const validateCard = (card: any, index: number): Card | null => {
  if (!card || typeof card !== 'object') return null;

  // Require at least side_a and side_b
  if (!card.side_a || !card.side_b) {
    console.warn(`Card at index ${index} missing required sides`);
    return null;
  }

  return {
    idx: index,
    name: sanitizeString(card.name || `card_${index}`),
    side_a: sanitizeString(card.side_a),
    side_b: sanitizeString(card.side_b),
    side_c: card.side_c ? sanitizeString(card.side_c) : undefined,
    side_d: card.side_d ? sanitizeString(card.side_d) : undefined,
    side_e: card.side_e ? sanitizeString(card.side_e) : undefined,
    side_f: card.side_f ? sanitizeString(card.side_f) : undefined,
    level: typeof card.level === 'number' ? Math.max(1, card.level) : 1,
  };
};

export const loadDeckFromJSON = async (jsonPath: string): Promise<Deck | null> => {
  try {
    // Don't modify the path - it should already be correct from the caller
    const response = await fetch(jsonPath);
    if (!response.ok) {
      console.error(`Failed to load deck from ${jsonPath}: ${response.status}`);
      return null;
    }

    const rawDeck = await response.json();

    // Validate deck structure
    if (!rawDeck || typeof rawDeck !== 'object') {
      console.error('Invalid deck structure');
      return null;
    }

    // Validate and sanitize metadata
    const metadata = validateMetadata(rawDeck.metadata);
    if (!metadata) {
      console.error('Invalid deck metadata');
      return null;
    }

    // Validate and sanitize cards
    if (!Array.isArray(rawDeck.content) || rawDeck.content.length === 0) {
      console.error('Deck has no valid cards');
      return null;
    }

    const cards = rawDeck.content
      .map((card: any, index: number) => validateCard(card, index))
      .filter(Boolean) as Card[];

    if (cards.length === 0) {
      console.error('No valid cards after sanitization');
      return null;
    }

    // Update card count to match actual validated cards
    metadata.card_count = cards.length;

    const deck: Deck = {
      id: sanitizeString(rawDeck.id || rawDeck.deck_id || `deck_${Date.now()}`),
      metadata,
      content: cards,
    };

    console.log(`Successfully loaded deck: ${deck.metadata.deck_name} with ${cards.length} cards`);
    return deck;
  } catch (error) {
    console.error(`Error loading deck from ${jsonPath}:`, error);
    return null;
  }
};

// Dynamically discover and load all decks from the decks directory
export const loadAllDecks = async (): Promise<Deck[]> => {
  try {
    // First, try to fetch a directory listing (if server provides it)
    // Otherwise fall back to trying known deck patterns
    const decksBasePath = `${import.meta.env.BASE_URL}data/decks/`;

    // Try to fetch the directory listing or use a predefined manifest
    const deckFiles = await discoverDeckFiles(decksBasePath);

    if (deckFiles.length === 0) {
      console.warn('No deck files found');
      return [];
    }

    console.log(`Found ${deckFiles.length} deck files to load`);

    // Load all decks in parallel with sanitization
    const deckPromises = deckFiles.map(file =>
      loadDeckFromJSON(`${decksBasePath}${file}`)
    );

    const loadedDecks = await Promise.all(deckPromises);

    // Filter out any decks that failed validation
    const validDecks = loadedDecks.filter(Boolean) as Deck[];

    console.log(`Successfully loaded ${validDecks.length} of ${deckFiles.length} decks`);

    return validDecks;
  } catch (error) {
    console.error('Error loading decks:', error);
    return [];
  }
};

// Helper to discover deck files from the auto-generated manifest
async function discoverDeckFiles(basePath: string): Promise<string[]> {
  try {
    // The manifest is auto-generated when dev/build runs
    const manifestResponse = await fetch(`${basePath}manifest.json`);
    if (!manifestResponse.ok) {
      console.error('Failed to fetch deck manifest');
      return [];
    }

    const manifest = await manifestResponse.json();
    if (!Array.isArray(manifest)) {
      console.error('Invalid manifest format');
      return [];
    }

    // Filter for JSON files (extra safety check)
    const deckFiles = manifest.filter(f =>
      typeof f === 'string' && f.endsWith('.json')
    );

    console.log(`Manifest loaded: ${deckFiles.length} deck files found`);
    return deckFiles;

  } catch (error) {
    console.error('Error loading deck manifest:', error);
    return [];
  }
}