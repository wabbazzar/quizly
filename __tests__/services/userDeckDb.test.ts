import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { closeDatabase, deleteDatabase } from '../../src/services/db';
import {
  saveUserDeck,
  loadUserDecks,
  getUserDeck,
  deleteUserDeck,
  mergeWithUserDecks,
} from '../../src/services/userDeckDb';
import { Deck } from '../../src/types';

function makeDeck(id: string, name: string, cards: Array<{ a: string; b: string }> = []): Deck {
  return {
    id,
    metadata: {
      deck_name: name,
      description: '',
      category: 'custom',
      available_levels: [1],
      available_sides: 2,
      card_count: cards.length,
      difficulty: 'beginner',
      tags: ['user-created'],
    },
    content: cards.map((c, i) => ({
      idx: i,
      name: `Card ${i + 1}`,
      side_a: c.a,
      side_b: c.b,
      level: 1,
    })),
  };
}

describe('userDeckDb', () => {
  beforeEach(async () => {
    closeDatabase();
    await deleteDatabase();
  });

  afterEach(async () => {
    closeDatabase();
    await deleteDatabase();
  });

  it('saves and loads a user deck', async () => {
    const deck = makeDeck('test-1', 'My Deck', [{ a: 'Q1', b: 'A1' }]);
    await saveUserDeck(deck, false);

    const loaded = await loadUserDecks();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].deck.id).toBe('test-1');
    expect(loaded[0].deck.metadata.deck_name).toBe('My Deck');
    expect(loaded[0].deck.content).toHaveLength(1);
    expect(loaded[0].isLibraryOverride).toBe(false);
  });

  it('getUserDeck returns single deck by ID', async () => {
    await saveUserDeck(makeDeck('a', 'Deck A'), false);
    await saveUserDeck(makeDeck('b', 'Deck B'), false);

    const result = await getUserDeck('b');
    expect(result?.deck.metadata.deck_name).toBe('Deck B');
  });

  it('getUserDeck returns null for missing ID', async () => {
    const result = await getUserDeck('nonexistent');
    expect(result).toBeNull();
  });

  it('deleteUserDeck removes a deck', async () => {
    await saveUserDeck(makeDeck('del-me', 'Delete Me'), false);
    await deleteUserDeck('del-me');

    const result = await getUserDeck('del-me');
    expect(result).toBeNull();
  });

  it('saveUserDeck overwrites on same ID', async () => {
    await saveUserDeck(makeDeck('up', 'Version 1'), false);
    await saveUserDeck(makeDeck('up', 'Version 2', [{ a: 'Q', b: 'A' }]), false);

    const loaded = await loadUserDecks();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].deck.metadata.deck_name).toBe('Version 2');
    expect(loaded[0].deck.content).toHaveLength(1);
  });

  describe('mergeWithUserDecks', () => {
    it('appends user decks to library decks', async () => {
      const library = [makeDeck('lib-1', 'Library Deck')];
      await saveUserDeck(makeDeck('user-1', 'User Deck'), false);

      const merged = await mergeWithUserDecks(library);
      expect(merged).toHaveLength(2);
      expect(merged.map(d => d.id)).toContain('lib-1');
      expect(merged.map(d => d.id)).toContain('user-1');
    });

    it('overrides library deck with user-edited version', async () => {
      const library = [makeDeck('lib-1', 'Original Name')];
      await saveUserDeck(makeDeck('lib-1', 'Edited Name', [{ a: 'New Q', b: 'New A' }]), true);

      const merged = await mergeWithUserDecks(library);
      expect(merged).toHaveLength(1);
      expect(merged[0].metadata.deck_name).toBe('Edited Name');
      expect(merged[0].content).toHaveLength(1);
    });

    it('returns library decks unmodified when no user decks exist', async () => {
      const library = [makeDeck('lib-1', 'Untouched')];
      const merged = await mergeWithUserDecks(library);
      expect(merged).toEqual(library);
    });

    it('handles mix of overrides and new user decks', async () => {
      const library = [
        makeDeck('lib-1', 'Lib 1'),
        makeDeck('lib-2', 'Lib 2'),
      ];
      await saveUserDeck(makeDeck('lib-1', 'Edited Lib 1'), true); // override
      await saveUserDeck(makeDeck('user-new', 'Brand New'), false); // new

      const merged = await mergeWithUserDecks(library);
      expect(merged).toHaveLength(3);
      expect(merged.find(d => d.id === 'lib-1')?.metadata.deck_name).toBe('Edited Lib 1');
      expect(merged.find(d => d.id === 'lib-2')?.metadata.deck_name).toBe('Lib 2');
      expect(merged.find(d => d.id === 'user-new')?.metadata.deck_name).toBe('Brand New');
    });
  });
});
