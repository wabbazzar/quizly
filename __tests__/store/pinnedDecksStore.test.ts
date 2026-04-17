import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { usePinnedDecksStore } from '@/store/pinnedDecksStore';

describe('pinnedDecksStore', () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => {
      usePinnedDecksStore.setState({ pinnedDeckIds: [] });
    });
  });

  it('starts with no pinned decks', () => {
    expect(usePinnedDecksStore.getState().pinnedDeckIds).toEqual([]);
  });

  it('togglePin adds an unpinned deck', () => {
    act(() => {
      usePinnedDecksStore.getState().togglePin('deck-1');
    });
    expect(usePinnedDecksStore.getState().pinnedDeckIds).toEqual(['deck-1']);
  });

  it('togglePin removes an already-pinned deck', () => {
    act(() => {
      usePinnedDecksStore.getState().togglePin('deck-1');
      usePinnedDecksStore.getState().togglePin('deck-1');
    });
    expect(usePinnedDecksStore.getState().pinnedDeckIds).toEqual([]);
  });

  it('isPinned reflects current state', () => {
    expect(usePinnedDecksStore.getState().isPinned('deck-1')).toBe(false);
    act(() => {
      usePinnedDecksStore.getState().togglePin('deck-1');
    });
    expect(usePinnedDecksStore.getState().isPinned('deck-1')).toBe(true);
  });

  it('preserves insertion order across multiple pins', () => {
    act(() => {
      usePinnedDecksStore.getState().togglePin('deck-a');
      usePinnedDecksStore.getState().togglePin('deck-b');
      usePinnedDecksStore.getState().togglePin('deck-c');
    });
    expect(usePinnedDecksStore.getState().pinnedDeckIds).toEqual([
      'deck-a',
      'deck-b',
      'deck-c',
    ]);
  });

  it('removes only the toggled deck when multiple are pinned', () => {
    act(() => {
      usePinnedDecksStore.getState().togglePin('deck-a');
      usePinnedDecksStore.getState().togglePin('deck-b');
      usePinnedDecksStore.getState().togglePin('deck-c');
      usePinnedDecksStore.getState().togglePin('deck-b');
    });
    expect(usePinnedDecksStore.getState().pinnedDeckIds).toEqual([
      'deck-a',
      'deck-c',
    ]);
  });

  it('writes pinnedDeckIds to localStorage under the correct key', () => {
    const setItemSpy = vi.spyOn(localStorage, 'setItem');

    act(() => {
      usePinnedDecksStore.getState().togglePin('deck-x');
    });

    const call = setItemSpy.mock.calls.find(([key]) => key === 'pinned-decks-store');
    expect(call).toBeDefined();
    const parsed = JSON.parse(call![1] as string);
    expect(parsed.state.pinnedDeckIds).toEqual(['deck-x']);
  });
});
