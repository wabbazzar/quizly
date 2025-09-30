import {
  Deck,
  DeckMetadata,
  Card,
  DeckReading,
  ReadingSidesMap,
  ReadingTokenizationConfig,
  DeckReadingDialogue,
  ReadingLine,
  SideId
} from '@/types';

// Sanitization helper to prevent XSS
const sanitizeString = (str: unknown): string => {
  if (typeof str !== 'string') return '';
  // React automatically escapes text content, so we only need minimal sanitization
  // We'll keep angle brackets escaped to prevent HTML injection
  // Note: Forward slashes, ampersands, quotes, and apostrophes are safe in React text content
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // Removed quote and apostrophe escaping - React handles these safely
  // Removed forward slash escaping as it's safe and breaks pinyin display
  // Removed ampersand escaping as it's safe for text content and commonly used in titles
};

// Type guard to check if value is a record
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

// Validate deck metadata structure
const validateMetadata = (metadata: unknown): DeckMetadata | null => {
  if (!isRecord(metadata)) return null;

  // Required fields
  if (!metadata.deck_name || !metadata.description || !metadata.category) {
    // Deck metadata missing required fields
    return null;
  }

  // Validate difficulty enum
  const validDifficulties = ['beginner', 'intermediate', 'advanced', 'beginner_to_intermediate'];
  if (typeof metadata.difficulty !== 'string' || !validDifficulties.includes(metadata.difficulty)) {
    // Invalid difficulty value
    return null;
  }

  return {
    deck_name: sanitizeString(metadata.deck_name),
    description: sanitizeString(metadata.description),
    category: sanitizeString(metadata.category),
    available_levels: Array.isArray(metadata.available_levels)
      ? metadata.available_levels.filter(l => typeof l === 'number')
      : [1],
    available_sides:
      typeof metadata.available_sides === 'number'
        ? Math.min(6, Math.max(2, metadata.available_sides))
        : 2,
    side_labels: isRecord(metadata.side_labels)
      ? {
          side_a: metadata.side_labels.side_a
            ? sanitizeString(metadata.side_labels.side_a)
            : undefined,
          side_b: metadata.side_labels.side_b
            ? sanitizeString(metadata.side_labels.side_b)
            : undefined,
          side_c: metadata.side_labels.side_c
            ? sanitizeString(metadata.side_labels.side_c)
            : undefined,
          side_d: metadata.side_labels.side_d
            ? sanitizeString(metadata.side_labels.side_d)
            : undefined,
          side_e: metadata.side_labels.side_e
            ? sanitizeString(metadata.side_labels.side_e)
            : undefined,
          side_f: metadata.side_labels.side_f
            ? sanitizeString(metadata.side_labels.side_f)
            : undefined,
        }
      : undefined,
    card_count: typeof metadata.card_count === 'number' ? metadata.card_count : 0,
    difficulty: metadata.difficulty as DeckMetadata['difficulty'],
    tags: Array.isArray(metadata.tags) ? metadata.tags.map(sanitizeString).filter(Boolean) : [],
    version: sanitizeString(metadata.version || '1.0.0'),
    created_date:
      typeof metadata.created_date === 'string'
        ? metadata.created_date.split('T')[0]
        : new Date().toISOString().split('T')[0],
    last_updated:
      typeof metadata.last_updated === 'string'
        ? metadata.last_updated.split('T')[0]
        : new Date().toISOString().split('T')[0],
  };
};

// Validate and sanitize card data
const validateCard = (card: unknown, index: number): Card | null => {
  if (!isRecord(card)) return null;

  // Require at least side_a and side_b
  if (!card.side_a || !card.side_b) {
    // Card missing required sides
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

// Validate reading line structure
const validateReadingLine = (line: unknown): ReadingLine | null => {
  if (!isRecord(line)) return null;

  // At least one side should be present
  const hasContent = line.a || line.b || line.c || line.d || line.e || line.f;
  if (!hasContent) return null;

  return {
    a: line.a ? sanitizeString(line.a) : undefined,
    b: line.b ? sanitizeString(line.b) : undefined,
    c: line.c ? sanitizeString(line.c) : undefined,
    d: line.d ? sanitizeString(line.d) : undefined,
    e: line.e ? sanitizeString(line.e) : undefined,
    f: line.f ? sanitizeString(line.f) : undefined,
    alignments: Array.isArray(line.alignments) ? line.alignments : undefined,
    wordAlignments: Array.isArray(line.wordAlignments) ? line.wordAlignments : undefined
  };
};

// Validate dialogue structure
const validateDialogue = (dialogue: unknown): DeckReadingDialogue | null => {
  if (!isRecord(dialogue) || !Array.isArray(dialogue.lines)) return null;

  const validLines = dialogue.lines
    .map(validateReadingLine)
    .filter(Boolean) as ReadingLine[];

  if (validLines.length === 0) return null;

  return { lines: validLines };
};

// Validate reading sides map
const validateReadingSides = (sides: unknown): ReadingSidesMap | null => {
  if (!isRecord(sides)) return null;

  const validSides: ReadingSidesMap = {};
  const sideIds: SideId[] = ['a', 'b', 'c', 'd', 'e', 'f'];

  for (const side of sideIds) {
    if (sides[side] && typeof sides[side] === 'string') {
      validSides[side] = sanitizeString(sides[side]);
    }
  }

  return Object.keys(validSides).length > 0 ? validSides : null;
};

// Validate tokenization config
const validateTokenization = (tokenization: unknown): ReadingTokenizationConfig | null => {
  if (!isRecord(tokenization)) return null;

  const defaultConfig: ReadingTokenizationConfig = {
    unit: {
      a: 'character',
      b: 'space',
      c: 'space',
      d: undefined,
      e: undefined,
      f: undefined
    },
    preservePunctuation: true,
    alignment: undefined
  };

  if (isRecord(tokenization.unit)) {
    const sideIds: SideId[] = ['a', 'b', 'c', 'd', 'e', 'f'];
    for (const side of sideIds) {
      const unit = tokenization.unit[side];
      if (unit === 'character' || unit === 'word' || unit === 'space') {
        defaultConfig.unit[side] = unit;
      }
    }
  }

  if (typeof tokenization.preservePunctuation === 'boolean') {
    defaultConfig.preservePunctuation = tokenization.preservePunctuation;
  }

  if (tokenization.alignment === 'index') {
    defaultConfig.alignment = 'index';
  }

  return defaultConfig;
};

// Validate reading content
const validateReading = (reading: unknown): DeckReading | null => {
  if (!isRecord(reading) || !isRecord(reading.dialogues)) return null;

  const validDialogues: Record<string, DeckReadingDialogue> = {};

  for (const [key, dialogue] of Object.entries(reading.dialogues)) {
    const validDialogue = validateDialogue(dialogue);
    if (validDialogue) {
      validDialogues[key] = validDialogue;
    }
  }

  if (Object.keys(validDialogues).length === 0) return null;

  return {
    sides: reading.sides ? validateReadingSides(reading.sides) || undefined : undefined,
    tokenization: reading.tokenization ? validateTokenization(reading.tokenization) || undefined : undefined,
    dialogues: validDialogues
  };
};

export const loadDeckFromJSON = async (jsonPath: string): Promise<Deck | null> => {
  try {
    // Don't modify the path - it should already be correct from the caller
    const response = await fetch(jsonPath);
    if (!response.ok) {
      // Failed to load deck
      return null;
    }

    const rawDeck = await response.json();

    // Validate deck structure
    if (!rawDeck || typeof rawDeck !== 'object') {
      // Invalid deck structure
      return null;
    }

    // Validate and sanitize metadata
    const metadata = validateMetadata(rawDeck.metadata);
    if (!metadata) {
      // Invalid deck metadata
      return null;
    }

    // Validate and sanitize cards
    if (!Array.isArray(rawDeck.content) || rawDeck.content.length === 0) {
      // Deck has no valid cards
      return null;
    }

    const cards = rawDeck.content
      .map((card: unknown, index: number) => validateCard(card, index))
      .filter(Boolean) as Card[];

    if (cards.length === 0) {
      // No valid cards after sanitization
      return null;
    }

    // Update card count to match actual validated cards
    metadata.card_count = cards.length;

    // Validate reading content if present
    const reading = rawDeck.reading ? validateReading(rawDeck.reading) || undefined : undefined;

    const deck: Deck = {
      id: sanitizeString(rawDeck.id || rawDeck.deck_id || `deck_${Date.now()}`),
      metadata,
      content: cards,
      reading
    };

    // Deck loaded successfully
    return deck;
  } catch (error) {
    // Error loading deck
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
      // No deck files found
      return [];
    }

    // Found deck files to load

    // Load all decks in parallel with sanitization
    const deckPromises = deckFiles.map(file => loadDeckFromJSON(`${decksBasePath}${file}`));

    const loadedDecks = await Promise.all(deckPromises);

    // Filter out any decks that failed validation
    const validDecks = loadedDecks.filter(Boolean) as Deck[];

    // Decks loaded successfully

    return validDecks;
  } catch (error) {
    // Error loading decks
    return [];
  }
};

// Helper to discover deck files from the auto-generated manifest
async function discoverDeckFiles(basePath: string): Promise<string[]> {
  try {
    // The manifest is auto-generated when dev/build runs
    const manifestResponse = await fetch(`${basePath}manifest.json`);
    if (!manifestResponse.ok) {
      // Failed to fetch deck manifest
      return [];
    }

    const manifest = await manifestResponse.json();
    if (!Array.isArray(manifest)) {
      // Invalid manifest format
      return [];
    }

    // Filter for JSON files (extra safety check)
    const deckFiles = manifest.filter(f => typeof f === 'string' && f.endsWith('.json'));

    // Manifest loaded successfully
    return deckFiles;
  } catch (error) {
    // Error loading deck manifest
    return [];
  }
}
