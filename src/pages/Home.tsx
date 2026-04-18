import { FC, useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDeckStore } from '@/store/deckStore';
import { useProgressStore } from '@/store/progressStore';
import { useDeckVisibilityStore } from '@/store/deckVisibilityStore';
import { usePinnedDecksStore } from '@/store/pinnedDecksStore';
import EnhancedDeckCard from '@/components/EnhancedDeckCard';
import { CompactDeckGrid } from '@/components/deck/CompactDeckGrid';
import { FamilySection } from '@/components/deck/FamilySection';
import { loadTranscriptManifest } from '@/services/transcriptService';
import { DeckVisibilityModal } from '@/components/modals/DeckVisibilityModal';
import CardDetailsModal from '@/components/modals/CardDetailsModal';
import { SearchResults, CardSearchResult } from '@/components/search/SearchResults';
import { SearchIcon, CloseIcon } from '@/components/icons/NavigationIcons';
import { DeckActionMenu } from '@/components/deck/DeckActionMenu';
import { Input } from '@/components/ui/Input';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Deck, DeckFamily, Card } from '@/types';
import { UserMenu } from '@/components/auth/UserMenu';
import { DeckImportModal } from '@/components/deck/DeckImportModal';
import { WalkthroughOverlay, WalkthroughStep } from '@/components/common/WalkthroughOverlay';
import { useSyncStore } from '@/store/syncStore';
import styles from './Home.module.css';

const GUEST_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    title: 'Welcome to Quizly!',
    description: 'A flashcard app for serious learners. Browse decks, study with multiple modes, and track your mastery.',
  },
  {
    targetSelector: '[class*="sectionTitle"]',
    title: 'Your Decks',
    description: 'This is your deck library. Tap any deck to see study modes like Flashcards, Learn, Match, and Read.',
    position: 'bottom',
  },
  {
    targetSelector: 'button[aria-label="Deck actions"]',
    title: 'Create & Import',
    description: 'Use this menu to create new decks, import from JSON files, or manage which decks are visible.',
    position: 'bottom',
  },
  {
    targetSelector: '[class*="userMenuContainer"]',
    title: 'Sync Across Devices',
    description: 'Sign in to save your decks and progress to the cloud. Your data syncs automatically.',
    position: 'bottom',
  },
];

const OTHER_FAMILY: DeckFamily = {
  id: '__other__',
  name: 'Other',
  description: 'Uncategorized decks',
  color: '#6b7280',
  sortOrder: 9999,
};

interface FamilyGroup {
  family: DeckFamily;
  decks: Deck[];
}

const Home: FC = () => {
  const navigate = useNavigate();
  const { decks, isLoading, error, loadDecks, selectDeck } = useDeckStore();
  const { getDeckProgress } = useProgressStore();
  const {
    hiddenDeckIds,
    families,
    loadFamilies,
  } = useDeckVisibilityStore();
  const pinnedDeckIds = usePinnedDecksStore(state => state.pinnedDeckIds);
  const isGuest = useSyncStore(state => state.isGuest);
  const headerRef = useRef<HTMLElement | null>(null);
  const isMobile = useIsMobile();
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  useEffect(() => {
    const node = headerRef.current;
    if (!node) return;
    const img = node.querySelector('img.' + styles.mascot) as HTMLImageElement | null;
    if (!img) return;

    const updateGradientStart = () => {
      try {
        const rect = img.getBoundingClientRect();
        const headerRect = node.getBoundingClientRect();
        const start = Math.max(0, rect.right - headerRect.left + 8);
        node.style.setProperty('--grad-start', `${Math.round(start)}px`);
        node.style.setProperty('--left-color', '#5b82b0');
        node.style.setProperty(
          '--right-color',
          getComputedStyle(document.documentElement).getPropertyValue('--primary-main') || '#5b82b0'
        );
      } catch {}
    };

    updateGradientStart();
    const onResize = () => updateGradientStart();
    window.addEventListener('resize', onResize);

    // Defer canvas operations to avoid blocking initial render
    const setHeaderStartFromImage = () => {
      // Use requestIdleCallback if available, otherwise setTimeout
      const deferredTask = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 1;
          canvas.height = 1;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(img, 0, 0, 1, 1);
          const data = ctx.getImageData(0, 0, 1, 1).data;
          const toHex = (v: number) => v.toString(16).padStart(2, '0');
          const hex = `#${toHex(data[0])}${toHex(data[1])}${toHex(data[2])}`;
          node.style.setProperty('--header-start', hex);
          updateGradientStart();
        } catch {}
      };

      if ('requestIdleCallback' in window) {
        (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(deferredTask);
      } else {
        setTimeout(deferredTask, 0);
      }
    };

    if (img.complete) {
      setHeaderStartFromImage();
    } else {
      img.addEventListener('load', setHeaderStartFromImage, { once: true });
    }

    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    loadDecks();
    loadFamilies();
    // Preload the transcript manifest so CompactDeckCard can synchronously
    // decide whether to render the Reading badge on first paint (prevents a
    // post-mount re-render + layout animation that looks like page jitter).
    loadTranscriptManifest().catch(() => {});
  }, [loadDecks, loadFamilies]);

  const handleModeSelect = useCallback(
    (deckId: string, _mode: string) => {
      selectDeck(deckId);
      // Mode navigation is handled by EnhancedDeckCard
    },
    [selectDeck]
  );

  // Mobile: Handle compact card tap - navigate directly to deck page
  const handleCompactDeckSelect = useCallback(
    (deckId: string) => {
      selectDeck(deckId);
      navigate(`/deck/${deckId}`);
    },
    [selectDeck, navigate]
  );

  // Filter hidden decks and group by family
  const visibleDecks = useMemo(
    () => decks.filter(d => !hiddenDeckIds.includes(d.id)),
    [decks, hiddenDeckIds]
  );

  const familyGroups = useMemo((): FamilyGroup[] => {
    const groupMap = new Map<string, Deck[]>();
    const pinnedSet = new Set(pinnedDeckIds);

    visibleDecks.forEach(deck => {
      const familyId = deck.metadata.family_id || '__other__';
      const existing = groupMap.get(familyId) || [];
      existing.push(deck);
      groupMap.set(familyId, existing);
    });

    // Float pinned decks to the top of each family, preserving within-group order.
    const sortPinnedFirst = (decks: Deck[]): Deck[] => {
      const pinned: Deck[] = [];
      const unpinned: Deck[] = [];
      decks.forEach(d => (pinnedSet.has(d.id) ? pinned : unpinned).push(d));
      return pinned.length > 0 ? [...pinned, ...unpinned] : decks;
    };

    const groups: FamilyGroup[] = [];

    // Add families in sort order
    families.forEach(family => {
      const familyDecks = groupMap.get(family.id);
      if (familyDecks && familyDecks.length > 0) {
        groups.push({ family, decks: sortPinnedFirst(familyDecks) });
        groupMap.delete(family.id);
      }
    });

    // Add "Other" group for remaining decks
    const otherDecks = groupMap.get('__other__');
    if (otherDecks && otherDecks.length > 0) {
      groups.push({ family: OTHER_FAMILY, decks: sortPinnedFirst(otherDecks) });
    }

    return groups;
  }, [visibleDecks, families, pinnedDeckIds]);

  const SIDE_KEYS: (keyof Card)[] = ['side_a', 'side_b', 'side_c', 'side_d', 'side_e', 'side_f', 'side_g'];
  // Lower weight ranks first. side_b is preferred, then side_a, then the rest.
  const SIDE_WEIGHT: Partial<Record<keyof Card, number>> = {
    side_b: 0,
    side_a: 1,
    side_c: 2,
    side_d: 3,
    side_e: 4,
    side_f: 5,
    side_g: 6,
  };

  const isSearching = searchQuery.trim().length > 0;

  const searchResults = useMemo((): CardSearchResult[] => {
    const strip = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const q = strip(searchQuery.trim());
    if (!q) return [];

    // Levenshtein distance with two-row DP (O(n*m) time, O(min) space).
    const lev = (a: string, b: string): number => {
      if (a === b) return 0;
      if (!a.length) return b.length;
      if (!b.length) return a.length;
      let prev = new Array(b.length + 1);
      let curr = new Array(b.length + 1);
      for (let j = 0; j <= b.length; j++) prev[j] = j;
      for (let i = 1; i <= a.length; i++) {
        curr[0] = i;
        for (let j = 1; j <= b.length; j++) {
          const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
          curr[j] = Math.min(
            curr[j - 1] + 1,
            prev[j] + 1,
            prev[j - 1] + cost
          );
        }
        [prev, curr] = [curr, prev];
      }
      return prev[b.length];
    };

    // Split into tokens for whole-word / starts-with checks. Works across
    // Latin and CJK: CJK text has no spaces, so the whole string becomes
    // one token, and substring/Lev tiers still catch partial matches.
    const tokenize = (s: string): string[] =>
      s.split(/[^\p{L}\p{N}]+/u).filter(Boolean);

    // Tier ordering (lower = better):
    //   0 whole-word match
    //   1 token starts with query
    //   2 query appears as substring anywhere in side
    //   3 fuzzy-only (ranked by Lev distance)
    const scoreSide = (raw: string): { tier: number; lev: number } | null => {
      const s = strip(raw);
      if (!s) return null;
      const tokens = tokenize(s);
      let tier = 3;
      let bestLev = Infinity;
      for (const tok of tokens) {
        if (tok === q) tier = Math.min(tier, 0);
        else if (tok.startsWith(q)) tier = Math.min(tier, 1);
        const d = lev(q, tok);
        if (d < bestLev) bestLev = d;
      }
      if (tier > 2 && s.includes(q)) tier = 2;
      if (bestLev === Infinity) bestLev = lev(q, s);
      return { tier, lev: bestLev };
    };

    type Scored = CardSearchResult & { tier: number; lev: number; sideWeight: number };
    const scored: Scored[] = [];
    // Fuzzy tier (3) is noisy for very short queries — only keep it when
    // the query is long enough for edit distance to be meaningful.
    const allowFuzzy = q.length >= 3;
    const fuzzyCap = Math.max(1, Math.floor(q.length / 3));

    for (const deck of visibleDecks) {
      if (!deck.content) continue;
      for (const card of deck.content) {
        let best: { tier: number; lev: number; sideWeight: number } | null = null;
        for (const key of SIDE_KEYS) {
          const val = card[key];
          if (typeof val !== 'string') continue;
          const s = scoreSide(val);
          if (!s) continue;
          if (s.tier === 3 && (!allowFuzzy || s.lev > fuzzyCap)) continue;
          const weight = SIDE_WEIGHT[key] ?? 99;
          const entry = { tier: s.tier, lev: s.lev, sideWeight: weight };
          if (
            !best ||
            entry.tier < best.tier ||
            (entry.tier === best.tier && entry.lev < best.lev) ||
            (entry.tier === best.tier && entry.lev === best.lev && entry.sideWeight < best.sideWeight)
          ) {
            best = entry;
          }
        }
        // Also consider card.name as a weak extra signal, but don't let it
        // surface cards that have no side match.
        if (best) scored.push({ card, deck, ...best });
      }
    }

    scored.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      if (a.lev !== b.lev) return a.lev - b.lev;
      if (a.sideWeight !== b.sideWeight) return a.sideWeight - b.sideWeight;
      // Stable-ish tiebreakers for deterministic order.
      if (a.deck.id !== b.deck.id) return a.deck.id.localeCompare(b.deck.id);
      return (a.card.idx ?? 0) - (b.card.idx ?? 0);
    });

    return scored.map(({ card, deck }) => ({ card, deck }));
  }, [searchQuery, visibleDecks]);

  // When there's only one family, skip the section header
  const hasMutipleFamilies = familyGroups.length > 1;

  if (isLoading) {
    return null; // Let PageLazyBoundary handle loading state
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h2>Error Loading Decks</h2>
        <p>{error}</p>
        <button onClick={loadDecks} className={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <header
        className={styles.header}
        ref={headerRef}
      >
            <div className={styles.iosSafeTop} aria-hidden="true" />
            <div className={styles.userMenuContainer}>
              <UserMenu />
            </div>
            <img
              src={`${import.meta.env.BASE_URL}icons/mrquizly.png`}
              alt="Mr. Quizly"
              className={styles.mascot}
              decoding="async"
              loading="eager"
            />
            <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
              <h1 className={styles.title}>Quizly</h1>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 1600 220"
                role="img"
                aria-labelledby="quizlyCursiveHeaderTitle"
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: 120,
                  transform: 'rotate(-6deg) skewX(-6deg)',
                  transformOrigin: 'center center',
                  marginTop: 8
                }}
                className={styles.taglineSvg}
              >
                <title id="quizlyCursiveHeaderTitle">it's not a test! -- cursive header</title>
                <style>{`
                  :root{
                    --quizly-blue:#4A90E2;
                    --quizly-white:#FFFFFF;
                  }
                  text {
                    font-family: "Pacifico", "Lobster", "Brush Script MT", "Segoe Script",
                                 "Snell Roundhand", "Dancing Script", cursive;
                    font-size: 94px;
                    font-weight: 700;
                    fill: var(--quizly-white);
                    letter-spacing: 3px;
                    paint-order: stroke fill;
                    stroke: var(--quizly-white);
                    stroke-width: 1px;
                    dominant-baseline: middle;
                    text-anchor: middle;
                  }
                  .tg-center { display: block; }
                  .tg-right { display: none; text-anchor: end; }
                  @media (max-width: 768px) {
                    .tg-center { display: none; }
                    .tg-right { display: block; }
                    text { font-size: 172px; stroke-width: 1.6px; }
                  }
                `}</style>
                <text className="tg-center" x="50%" y="120">it's not a test!</text>
                <text className="tg-right" x="100%" y="120">it's not a test!</text>
              </svg>
        </motion.div>
      </header>

      <main className={styles.main}>
        <section className={styles.deckSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Available Decks</h2>
            <DeckActionMenu
              onNewDeck={() => navigate('/create-deck')}
              onImport={() => setImportModalOpen(true)}
              onManageVisibility={() => setModalOpen(true)}
            />
          </div>

          <div className={styles.searchBar}>
            <Input
              variant="outlined"
              fullWidth
              placeholder="Search cards..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              startIcon={<SearchIcon size={18} />}
              endIcon={
                searchQuery ? (
                  <button
                    className={styles.clearButton}
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    type="button"
                  >
                    <CloseIcon size={16} />
                  </button>
                ) : undefined
              }
              aria-label="Search cards across all decks"
            />
          </div>

          {isSearching ? (
            <SearchResults
              results={searchResults}
              query={searchQuery.trim()}
              onSelectCard={setSelectedCard}
            />
          ) : visibleDecks.length === 0 ? (
            <motion.div
              className={styles.emptyState}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <p>No decks available</p>
              <p className={styles.emptyHint}>
                {decks.length > 0
                  ? 'All decks are hidden. Use the manage button to show them.'
                  : 'Import a deck to get started'}
              </p>
            </motion.div>
          ) : (
            familyGroups.map(group => {
              const content = isMobile ? (
                <CompactDeckGrid
                  decks={group.decks}
                  onSelectDeck={handleCompactDeckSelect}
                />
              ) : (
                <div className={styles.deckGrid}>
                  {group.decks.map(deck => (
                    <EnhancedDeckCard
                      key={deck.id}
                      deck={deck}
                      progress={getDeckProgress(deck.id)}
                      onModeSelect={handleModeSelect}
                    />
                  ))}
                </div>
              );

              if (!hasMutipleFamilies) {
                return <div key={group.family.id}>{content}</div>;
              }

              return (
                <FamilySection
                  key={group.family.id}
                  family={group.family}
                  deckCount={group.decks.length}
                >
                  {content}
                </FamilySection>
              );
            })
          )}
        </section>
      </main>

      <DeckVisibilityModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        decks={decks}
      />

      <CardDetailsModal
        card={selectedCard}
        visible={selectedCard !== null}
        onClose={() => setSelectedCard(null)}
      />

      <DeckImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImported={(deckId) => navigate(`/deck/${deckId}`)}
      />

      {isGuest && !isLoading && visibleDecks.length > 0 && (
        <WalkthroughOverlay
          steps={GUEST_WALKTHROUGH_STEPS}
          storageKey="quizly_walkthrough_complete"
        />
      )}
    </div>
  );
};

export default Home;
